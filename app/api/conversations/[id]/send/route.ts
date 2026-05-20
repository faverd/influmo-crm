import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const db = createServiceClient()
  const { data: contact } = await db.from('contacts').select('phone').eq('id', id).single()
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const wamid = await sendTextMessage(contact.phone, message.trim())

  await db.from('messages').insert({
    contact_id: id,
    role: 'assistant',
    content: message.trim(),
    whatsapp_message_id: wamid,
    status: wamid ? 'sent' : 'failed',
  })

  return NextResponse.json({ ok: true, wamid })
}
