import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const { id: botId } = await params
  const supabase = createServiceClient()
  const url = new URL(req.url)
  const convId = url.searchParams.get('conversationId')

  // Return messages for a specific conversation
  if (convId) {
    const { data, error } = await supabase
      .from('bot_messages')
      .select('id, role, content, sources, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Return list of conversations for this bot
  const { data, error } = await supabase
    .from('bot_conversations')
    .select('id, title, message_count, created_at, updated_at')
    .eq('bot_id', botId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request, { params }: Params) {
  await params
  const supabase = createServiceClient()
  const url = new URL(req.url)
  const convId = url.searchParams.get('conversationId')
  if (!convId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

  const { error } = await supabase.from('bot_conversations').delete().eq('id', convId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
