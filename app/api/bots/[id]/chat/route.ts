import { createServiceClient } from '@/lib/supabase/server'
import { streamChat, createEmbedding, MODE_PROMPTS, type ChatMessage } from '@/lib/ai-providers'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { id: botId } = await params
  const enc = new TextEncoder()
  const dec = new TextDecoder()

  const { message, conversationId, images } = await req.json() as {
    message: string
    conversationId?: string
    images?: string[]
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

  // 3. Load history + documents catalog in parallel
  const [historyRes, docsRes] = await Promise.all([
    supabase
      .from('bot_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(20),
    supabase
      .from('bot_documents')
      .select('id, name, type, original_url, file_path, status, chunk_count')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false }),
  ])

  const history = historyRes.data ?? []
  const allDocs = docsRes.data ?? []
  const readyDocs = allDocs.filter(d => d.status === 'ready')

  // 4. RAG — vector search for relevant chunks
  let ragContext = ''
  let matchedDocIds: string[] = []
  const embKey = bot.embedding_key || (bot.provider === 'openai' ? bot.api_key : '')

  if (embKey && readyDocs.length > 0) {
    try {
      const embedding = await createEmbedding(message, embKey)
      const hasImages = !!(images && images.length)
      const { data: chunks } = await supabase.rpc('match_bot_chunks', {
        query_embedding: embedding,
        match_bot_id: botId,
        // Lower threshold + more chunks for images (vague query) so the bot has product context
        match_threshold: hasImages ? 0.15 : 0.35,
        match_count: hasImages ? 14 : 10,
      })
      if (chunks?.length) {
        ragContext = chunks.map((c: { content: string; document_id: string }) => c.content).join('\n\n---\n\n')
        matchedDocIds = [...new Set<string>(chunks.map((c: { document_id: string }) => c.document_id))]
      }
    } catch { /* RAG optional */ }
  }

  // 5. Build document catalog block for system prompt
  const baseUrl = 'https://svcaqqojjowzuivqplho.supabase.co/storage/v1/object/public/bot-documents'
  const docCatalog = allDocs.map(d => {
    const url = d.original_url || (d.file_path ? `${baseUrl}/${d.file_path}` : null)
    const status = d.status === 'ready' ? '✅' : '⏳'
    return `${status} [${d.name}]${url ? `(${url})` : ''} — tipo: ${d.type}, chunks: ${d.chunk_count ?? 0}`
  }).join('\n')

  // 6. Build system prompt
  const modePrompt = MODE_PROMPTS[bot.mode] ?? MODE_PROMPTS.general
  const personality = bot.personality ? `\n\nPersonalidad: ${bot.personality}` : ''
  const customPrompt = bot.system_prompt ? `\n\n${bot.system_prompt}` : ''

  const docBlock = allDocs.length > 0
    ? `\n\n## Documentos disponibles en la base de conocimiento:\nCuando compartas un documento SIEMPRE usa este formato exacto de markdown (nombre con extensión, URL completa sin espacios ni saltos de línea):\n[NOMBRE-ARCHIVO.pdf](URL)\nEjemplo: [FOSBITAL-INMUNE-80.pdf](https://...url...)\n\n${docCatalog}`
    : ''

  const ragBlock = ragContext
    ? `\n\n## Información relevante de la base de conocimiento (usa esto para responder):\n${ragContext}`
    : (readyDocs.length === 0 && allDocs.length > 0
      ? '\n\n## Nota: Los documentos están siendo procesados, pronto podrás usarlos para responder con información específica.'
      : '')

  const systemPrompt = `${modePrompt}${personality}${customPrompt}${docBlock}${ragBlock}

## CÓMO DEBES RESPONDER (muy importante):

Eres un asesor técnico-comercial experto. Cuando el usuario describe un problema, una planta, una plaga/enfermedad, o adjunta una IMAGEN:

1. **Diagnóstico primero**: Si hay imagen, describe qué observas (tipo de planta, hoja, síntomas, posible plaga o enfermedad, deficiencia nutricional, etc.) con detalle.

2. **Recomienda productos de la base de conocimiento** que resuelvan el problema. Para cada producto recomendado presenta una TABLA en markdown con esta estructura:

| 🧪 Producto | 💧 Dosis | 📐 Aplicación / Área | 💰 Precio | 📋 Ficha |
|-------------|----------|----------------------|-----------|----------|
| Nombre | 40-50ml/20L | Foliar / cultivos X | (si hay dato) | [ver](URL) |

3. **Usa emojis** relevantes para que sea visual y claro: 🌱 cultivo, 🐛 plaga, 🦠 enfermedad, ✅ beneficio, ⚠️ precaución, 💧 dosis, 📐 medida/área, 💰 precio, 📦 presentación, 🧪 producto.

4. **Incluye SIEMPRE la ficha técnica** del producto recomendado como link markdown: [NOMBRE-PRODUCTO.pdf](URL) — toma la URL del catálogo de documentos de arriba.

5. **Detalla**: dosis exactas, momentos de aplicación, compatibilidades, áreas/cultivos específicos, medidas, presentaciones, y precios SOLO si están en la información disponible. Nunca inventes precios ni datos: si no hay precio, escribe "Consultar".

6. **Cierra** con una recomendación práctica corta (qué aplicar, cuándo, cómo) y ofrece compartir la ficha técnica completa.

## Reglas:
- Responde SIEMPRE basándote en la información de la base de conocimiento; si un dato no está, dilo claramente.
- Para compartir documentos usa el formato exacto: [NOMBRE-ARCHIVO.pdf](URL)
- Usa tablas markdown siempre que compares productos, dosis o precios.
- Responde en ${bot.language === 'es' ? 'español' : bot.language === 'en' ? 'inglés' : 'portugués'}`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))),
    { role: 'user', content: message, images: images && images.length ? images : undefined },
  ]

  // 7. Save user message (include image markdown so it shows in history)
  const savedContent = images && images.length
    ? `${message}\n\n${images.map(u => `![imagen](${u})`).join('\n')}`
    : message
  await supabase.from('bot_messages').insert({
    conversation_id: convId,
    bot_id: botId,
    role: 'user',
    content: savedContent,
  })

  // 8. Stream response
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
            } catch { /* skip */ }
          }
        }

        // Save assistant message
        const { data: saved } = await supabase
          .from('bot_messages')
          .insert({ conversation_id: convId, bot_id: botId, role: 'assistant', content: fullResponse })
          .select('id')
          .single()

        // Update conversation + stats
        await Promise.all([
          supabase.from('bot_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId),
          supabase.from('bots').update({
            total_messages: bot.total_messages + 2,
            total_conversations: convId === conversationId ? bot.total_conversations : bot.total_conversations + 1,
          }).eq('id', botId),
        ])

        ctrl.enqueue(enc.encode(
          `data: ${JSON.stringify({ type: 'done', messageId: saved?.id, conversationId: convId, matchedDocs: matchedDocIds })}\n\n`
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
