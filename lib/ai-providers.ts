export type AIProvider = 'openai' | 'gemini' | 'openrouter'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatOptions {
  provider: AIProvider
  model: string
  apiKey: string
  temperature?: number
  maxTokens?: number
}

// ── Embedding (always OpenAI text-embedding-3-small) ──────────────────────────

export async function createEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Embedding API error ${res.status}`)
  }
  const data = await res.json()
  return data.data[0].embedding as number[]
}

// ── Streaming chat (returns a ReadableStream in OpenAI SSE format) ────────────

export async function streamChat(
  messages: ChatMessage[],
  opts: ChatOptions
): Promise<ReadableStream<Uint8Array>> {
  switch (opts.provider) {
    case 'openai':     return openaiStream(messages, opts)
    case 'gemini':     return geminiStream(messages, opts)
    case 'openrouter': return openrouterStream(messages, opts)
    default:           throw new Error(`Unknown provider: ${opts.provider}`)
  }
}

// ── OpenAI ────────────────────────────────────────────────────────────────────

async function openaiStream(messages: ChatMessage[], opts: ChatOptions) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      stream: true,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`)
  return res.body!
}

// ── Google Gemini ─────────────────────────────────────────────────────────────

async function geminiStream(messages: ChatMessage[], opts: ChatOptions) {
  const systemMsg = messages.find(m => m.role === 'system')
  const chatMsgs  = messages.filter(m => m.role !== 'system')

  const contents = chatMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 2048,
    },
  }
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] }

  const model = opts.model || 'gemini-1.5-flash'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${opts.apiKey}&alt=sse`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`)

  // Transform Gemini SSE → OpenAI SSE format so client code is provider-agnostic
  const enc = new TextEncoder()
  const dec = new TextDecoder()
  let buf = ''

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      buf += dec.decode(chunk, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data: ')) continue
        try {
          const json = JSON.parse(line.slice(6))
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
          if (text) {
            const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
            ctrl.enqueue(enc.encode(sse))
          }
        } catch { /* skip malformed */ }
      }
    },
    flush(ctrl) {
      ctrl.enqueue(enc.encode('data: [DONE]\n\n'))
    },
  })

  return res.body!.pipeThrough(transform)
}

// ── OpenRouter (DeepSeek, etc.) ───────────────────────────────────────────────

async function openrouterStream(messages: ChatMessage[], opts: ChatOptions) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://crm-clude.vercel.app',
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      stream: true,
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`)
  return res.body!
}

// ── Mode system prompts ───────────────────────────────────────────────────────

export const MODE_PROMPTS: Record<string, string> = {
  general: `Eres un asistente inteligente y profesional. Responde de forma clara, precisa y útil.
Usa markdown para estructurar tus respuestas cuando sea conveniente.`,

  sales: `Eres un consultor de ventas experto y asesor comercial especializado. Tu rol es:
- Recomendar productos y soluciones basándote en las necesidades del cliente
- Destacar beneficios, características y ventajas competitivas
- Proporcionar comparaciones objetivas entre productos
- Generar cotizaciones y propuestas de valor
- Responder sobre stock, precios, garantías y condiciones comerciales
Mantén un tono profesional, empático y orientado a cerrar negocios.`,

  technical: `Eres un especialista técnico y asesor de soporte. Tu rol es:
- Resolver dudas técnicas con precisión y claridad
- Proporcionar especificaciones, fichas técnicas y manuales
- Guiar en la instalación, configuración y uso correcto de productos
- Diagnosticar problemas y proponer soluciones
- Responder sobre compatibilidades, medidas y aplicaciones
Responde de forma técnica pero comprensible, usando ejemplos prácticos.`,

  agronomo: `Eres un Ingeniero Agrónomo IA experto con amplio conocimiento en agricultura, agronomía y producción agrícola. Tu rol es:
- Asesorar sobre fertilización, nutrición vegetal y manejo de suelos
- Orientar sobre control de plagas, enfermedades y malezas
- Proporcionar recomendaciones de riego y manejo hídrico
- Calcular dosis y programas de aplicación de agroquímicos
- Elaborar calendarios agrícolas y planificación de cultivos
- Verificar compatibilidades entre productos agrícolas
- Promover las Buenas Prácticas Agrícolas (BPA) y seguridad en el uso de agroquímicos
Responde con rigor técnico y científico, adaptando el lenguaje al nivel del productor o profesional.`,
}
