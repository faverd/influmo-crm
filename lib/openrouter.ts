const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!
const MODEL = 'deepseek/deepseek-chat-v3-0324'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://influmo.com',
      'X-Title': 'Influmo CRM',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 200,
      temperature: 0.7,
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenRouter error: ${await res.text()}`)
  }
  const data = await res.json()
  return data.choices[0].message.content.trim()
}

export async function qualify(messages: ChatMessage[]): Promise<{ score: 'hot' | 'warm' | 'cold'; reason: string }> {
  const classificationPrompt: ChatMessage[] = [
    {
      role: 'system',
      content: `Sos un clasificador de leads para una agencia de marketing de influencers.
Analizá la conversación y clasificá al lead en:
- HOT: interés real en contratar, preguntó por precios, agenda o quiere avanzar
- WARM: interés pero no llegó a querer agendar ni contratar
- COLD: sin interés, spam, busca empleo, solo curiosidad

Respondé ÚNICAMENTE con JSON válido sin markdown:
{"score": "hot"|"warm"|"cold", "reason": "explicación breve en español"}`,
    },
    ...messages,
    {
      role: 'user',
      content: 'Clasificá este lead según las instrucciones.',
    },
  ]

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://influmo.com',
      'X-Title': 'Influmo CRM',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: classificationPrompt,
      max_tokens: 150,
      temperature: 0.2,
    }),
  })

  if (!res.ok) throw new Error(`OpenRouter qualify error: ${await res.text()}`)
  const data = await res.json()
  const raw = data.choices[0].message.content.trim()

  try {
    const cleaned = raw.replace(/```json?/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { score: 'cold', reason: 'Error al parsear respuesta del clasificador' }
  }
}
