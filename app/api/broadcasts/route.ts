import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactIds, message } = await req.json()
  if (!message?.trim() || !Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const db = createServiceClient()
  let sent = 0
  let failed = 0

  for (const id of contactIds) {
    const { data: contact } = await db
      .from('contacts')
      .select('phone')
      .eq('id', id)
      .single()

    if (!contact) { failed++; continue }

    const wamid = await sendTextMessage(contact.phone, message.trim())

    await db.from('messages').insert({
      contact_id: id,
      role: 'assistant',
      content: message.trim(),
      whatsapp_message_id: wamid,
      status: wamid ? 'sent' : 'failed',
    })

    if (wamid) sent++; else failed++
  }

  return NextResponse.json({ ok: true, sent, failed, total: contactIds.length })
}
