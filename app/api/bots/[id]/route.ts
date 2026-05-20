import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await req.json()

  const allowed = [
    'name', 'description', 'mode', 'provider', 'model',
    'api_key', 'embedding_key', 'temperature', 'max_tokens',
    'personality', 'language', 'system_prompt', 'is_active', 'avatar_color',
  ]
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  )
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('bots')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase.from('bots').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
