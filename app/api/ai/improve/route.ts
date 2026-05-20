import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chat } from '@/lib/openrouter'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, mode, context } = await req.json()

  let messages
  if (mode === 'suggest') {
    const ctxText = (context ?? [])
      .slice(-8)
      .map((m: { role: string; content: string }) =>
        `${m.role === 'user' ? 'Cliente' : 'Agente'}: ${m.content}`
      )
      .join('\n')
    messages = [
      {
        role: 'system' as const,
        content:
          'Sos un asistente de ventas para una agencia de marketing de influencers. Basándote en la conversación, sugerí una respuesta breve, profesional y efectiva en español. Solo devolvé el texto del mensaje, sin explicaciones ni comillas.',
      },
      {
        role: 'user' as const,
        content: `Conversación reciente:\n${ctxText}\n\nSugerí una respuesta.`,
      },
    ]
  } else {
    if (!text?.trim()) return NextResponse.json({ error: 'Texto vacío' }, { status: 400 })
    messages = [
      {
        role: 'system' as const,
        content:
          'Mejorá el siguiente mensaje haciéndolo más profesional, claro y atractivo para ventas de una agencia de marketing. Mantené el mismo idioma y sentido. Solo devolvé el mensaje mejorado, sin explicaciones ni comillas.',
      },
      { role: 'user' as const, content: text },
    ]
  }

  try {
    const improved = await chat(messages)
    return NextResponse.json({ text: improved })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error de IA' }, { status: 500 })
  }
}
