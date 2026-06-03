import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const { email, role, full_name } = await req.json()
  if (!email || !role) return NextResponse.json({ error: 'Email y rol requeridos' }, { status: 400 })
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('user_roles')
    .upsert({ email: email.toLowerCase().trim(), role, full_name: full_name ?? '' }, { onConflict: 'email' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const { id } = await req.json()
  const supabase = createServiceClient()
  const { error } = await supabase.from('user_roles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
