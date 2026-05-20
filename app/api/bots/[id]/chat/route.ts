import { createServiceClient } from '@/lib/supabase/server'
import { streamChat, createEmbedding, MODE_PROMPTS, type ChatMessage } from '@/lib/ai-providers'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { id: botId } = await params
  const enc = new TextEncoder()
  const dec = new TextDecoder()

  const { message, conversationId } = await req.json() as {
    message: string
    conversationId?: string
  }

  const supabase = createServiceClient()

  // 1. Load bot config
  const { data: bot, error: botErr } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .single()

  if (botErr || !bot) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'Bot no encontrado' })}\n\n`,
      { status: 404, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // 2. Resolve or create conversation
  let convId = conversationId
  if (!convId) {
    const { data: conv } = await supabase
      .from('bot_conversations')
      .insert({ bot_id: botId, title: message.slice(0, 60) })
      .select('id')
      .single()
    convId = conv?.id
  }

  // 3. History (last 20 messages)
  const { data: history } = await supabase
    .from('bot_messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(20)

  // 4. RAG — vector search for relevant chunks
  let context = ''
  const embKey = bot.embedding_key || (bot.provider === 'openai' ? bot.api_key : '')
  if (embKey) {
    try {
      const embedding = await createEmbedding(message, embKey)
      const { data: chunks } = await supabase.rpc('match_bot_chunks', {
        query_embedding: embedding,
        match_bot_id: botId,
        match_threshold: 0.55,
        match_count: 6,
      })
      if (chunks?.length) {
        context = chunks.map((c: { content: string }) => c.content).join('\n\n---\n\n')
      }
    } catch { /* embeddings optional — continue without RAG */ }
  }

  // 5. Build system prompt
  const modePrompt  = MODE_PROMPTS[bot.mode] ?? MODE_PROMPTS.general
  const personality = bot.personality ? `\n\nPersonalidad: ${bot.personality}` : ''
  const customPrompt = bot.system_prompt ? `\n\n${bot.system_prompt}` : ''
  const contextBlock = context
    ? `\n\n## Información de referencia (usa esto para responder):\n${context}`
    : ''
  const systemPrompt = `${modePrompt}${personality}${customPrompt}${contextBlock}`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(history?.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })) ?? []),
    { role: 'user', content: message },
  ]

  // 6. Save user message
  await supabase.from('bot_messages').insert({
    conversation_id: convId,
    bot_id: botId,
    role: 'user',
    content: message,
  })

  // 7. Stream response
  let fullResponse = ''

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      try {
        ctrl.enqueue(enc.encode(
          `data: ${JSON.stringify({ type: 'meta', conversationId: convId })}\n\n`
        ))

        const aiStream = await streamChat(messages, {
          provider: bot.provider,
          model: bot.model,
          apiKey: bot.api_key,
          temperature: Number(bot.temperature),
          maxTokens: bot.max_tokens,
        })

        const reader = aiStream.getReader()
        let sseBuffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          sseBuffer += dec.decode(value, { stream: true })
          const parts = sseBuffer.split('\n\n')
          sseBuffer = parts.pop() ?? ''

          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6)
            if (raw === '[DONE]') continue
            try {
              const json = JSON.parse(raw)
              const token: string = json.choices?.[0]?.delta?.content ?? ''
              if (token) {
                fullResponse += token
                ctrl.enqueue(enc.encode(
                  `data: ${JSON.stringify({ type: 'token', content: token })}\n\n`
                ))
              }
            } catch { /* skip malformed */ }
          }
        }

        // Save assistant message
        const { data: saved } = await supabase
          .from('bot_messages')
          .insert({ conversation_id: convId, bot_id: botId, role: 'assistant', content: fullResponse })
          .select('id')
          .single()

        // Update conversation metadata
        await supabase
          .from('bot_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId)

        ctrl.enqueue(enc.encode(
          `data: ${JSON.stringify({ type: 'done', messageId: saved?.id, conversationId: convId })}\n\n`
        ))
      } catch (err) {
        ctrl.enqueue(enc.encode(
          `data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`
        ))
      } finally {
        ctrl.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
