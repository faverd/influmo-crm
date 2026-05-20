import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage, normalizePhone } from '@/lib/whatsapp'
import { chat, qualify } from '@/lib/openrouter'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!

// GET — verificación del webhook por Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — mensajes y status updates entrantes
export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = createServiceClient()

  const entry = body?.entry?.[0]
  const changes = entry?.changes?.[0]?.value

  if (!changes) return NextResponse.json({ ok: true })

  // --- Status updates (delivered / read) ---
  if (changes.statuses) {
    for (const s of changes.statuses) {
      const { id: wamid, status } = s
      if (['delivered', 'read', 'failed'].includes(status)) {
        await db
          .from('messages')
          .update({ status })
          .eq('whatsapp_message_id', wamid)
      }
    }
    return NextResponse.json({ ok: true })
  }

  // --- Incoming messages ---
  const messageObj = changes.messages?.[0]
  if (!messageObj || messageObj.type !== 'text') return NextResponse.json({ ok: true })

  const rawPhone = messageObj.from
  const phone = normalizePhone(rawPhone)
  const userText = messageObj.text.body
  const wamidIncoming = messageObj.id

  // Contexto de anuncio (CTWA)
  const ctwaClid = messageObj.referral?.ctwa_clid ?? null
  const adSource = messageObj.referral?.source_id ?? null

  // Buscar o crear contacto
  let { data: contact } = await db
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!contact) {
    const { data: newContact } = await db
      .from('contacts')
      .insert({ phone, ctwa_clid: ctwaClid, ad_source: adSource })
      .select()
      .single()
    contact = newContact
  } else if (ctwaClid && !contact.ctwa_clid) {
    await db.from('contacts').update({ ctwa_clid: ctwaClid, ad_source: adSource }).eq('id', contact.id)
  }

  if (!contact) return NextResponse.json({ ok: true })

  // Verificar si está bloqueado o bot desactivado
  if (contact.blocked || !contact.bot_active) {
    await db.from('messages').insert({
      contact_id: contact.id,
      role: 'user',
      content: userText,
      whatsapp_message_id: wamidIncoming,
    })
    return NextResponse.json({ ok: true })
  }

  // Guardar mensaje del usuario
  await db.from('messages').insert({
    contact_id: contact.id,
    role: 'user',
    content: userText,
    whatsapp_message_id: wamidIncoming,
  })

  // Obtener system prompt
  const { data: promptSetting } = await db
    .from('settings')
    .select('value')
    .eq('key', 'system_prompt')
    .single()
  const systemPrompt = promptSetting?.value ?? ''

  // Obtener historial (últimos 20 mensajes)
  const { data: history } = await db
    .from('messages')
    .select('role, content')
    .eq('contact_id', contact.id)
    .order('created_at', { ascending: true })
    .limit(20)

  const chatMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...(history ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  // Generar respuesta con DeepSeek
  let reply: string
  try {
    reply = await chat(chatMessages)
  } catch (err) {
    console.error('AI error:', err)
    reply = 'Uy, tuve un problemita técnico. Intentá de nuevo en unos minutos 🙏'
  }

  // Enviar respuesta por WhatsApp
  const wamidReply = await sendTextMessage(rawPhone, reply)

  // Guardar respuesta en DB
  await db.from('messages').insert({
    contact_id: contact.id,
    role: 'assistant',
    content: reply,
    whatsapp_message_id: wamidReply,
    status: wamidReply ? 'sent' : 'failed',
  })

  // Calificar lead en background (después de 3+ mensajes del usuario)
  const { count: userMsgCount } = await db
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('contact_id', contact.id)
    .eq('role', 'user')

  if ((userMsgCount ?? 0) >= 3) {
    // Check if already qualified recently (last 24h)
    const { data: recentLead } = await db
      .from('leads')
      .select('id')
      .eq('contact_id', contact.id)
      .gte('qualified_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single()

    if (!recentLead) {
      try {
        const result = await qualify(chatMessages.slice(1))
        const { data: lead } = await db
          .from('leads')
          .insert({ contact_id: contact.id, score: result.score, reason: result.reason })
          .select()
          .single()

        if (result.score === 'hot' && lead) {
          await db.from('leads').update({ notified: true }).eq('id', lead.id)
          console.log(`[HOT LEAD] ${phone} — ${result.reason}`)
        }
      } catch (err) {
        console.error('Lead qualification error:', err)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
