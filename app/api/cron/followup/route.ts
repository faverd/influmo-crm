import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/whatsapp'
import { chat } from '@/lib/openrouter'

// Hora Argentina = UTC-3
function getArgentinaHour(): number {
  const now = new Date()
  return (now.getUTCHours() + 24 - 3) % 24
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Solo entre 10:00 y 20:00 hora Argentina
  const hour = getArgentinaHour()
  if (hour < 10 || hour >= 20) {
    return NextResponse.json({ ok: true, skipped: 'Outside working hours (AR)' })
  }

  const db = createServiceClient()
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()

  // Obtener todos los contactos activos con mensajes recientes
  const { data: activeContacts } = await db
    .from('contacts')
    .select('id, phone')
    .eq('blocked', false)
    .eq('bot_active', true)

  if (!activeContacts || activeContacts.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  // Para cada contacto, verificar si el último mensaje fue de Berta hace 5+ horas
  // y hubo interacción en las últimas 23h
  const candidates: { id: string; phone: string }[] = []

  for (const c of activeContacts) {
    const { data: lastMsg } = await db
      .from('messages')
      .select('role, created_at')
      .eq('contact_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!lastMsg) continue
    const msgTime = lastMsg.created_at

    // Último mensaje fue de Berta hace 5+ horas y dentro de 23h
    if (
      lastMsg.role === 'assistant' &&
      msgTime <= fiveHoursAgo &&
      msgTime >= twentyThreeHoursAgo
    ) {
      candidates.push(c)
    }
  }

  const { data: promptSetting } = await db
    .from('settings')
    .select('value')
    .eq('key', 'system_prompt')
    .single()
  const systemPrompt = promptSetting?.value ?? ''

  let sent = 0
  for (const c of candidates) {
    try {
      const { data: history } = await db
        .from('messages')
        .select('role, content')
        .eq('contact_id', c.id)
        .order('created_at', { ascending: true })
        .limit(20)

      const messages = [
        {
          role: 'system' as const,
          content: `${systemPrompt}\n\nIMPORTANTE: El usuario no respondió desde hace varias horas. Enviá un follow-up breve y natural, sin ser insistente. Máximo 20 palabras.`,
        },
        ...(history ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ]

      const reply = await chat(messages)
      const wamid = await sendTextMessage(c.phone, reply)

      await db.from('messages').insert({
        contact_id: c.id,
        role: 'assistant',
        content: reply,
        whatsapp_message_id: wamid,
        status: wamid ? 'sent' : 'failed',
      })
      sent++
    } catch (err) {
      console.error(`Follow-up error for contact ${c.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, sent })
}
