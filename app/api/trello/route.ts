import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('trello_board').select('data').eq('id', 'main').single()
  return NextResponse.json(data?.data ?? {})
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = createServiceClient()
  const { error } = await supabase.from('trello_board')
    .upsert({ id: 'main', data: body, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
