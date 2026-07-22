import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder = req.nextUrl.searchParams.get('folder')
  const limit = Number(req.nextUrl.searchParams.get('limit') || 200)

  let query = supabase.from('comunicacion_mensajes').select('*').order('created_at', { ascending: false }).limit(limit)
  if (folder) query = query.eq('folder', folder)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count } = await supabase
    .from('comunicacion_mensajes')
    .select('id', { count: 'exact', head: true })
    .eq('folder', 'bandeja')
    .eq('leido', false)

  return NextResponse.json({ mensajes: data ?? [], unread_count: count ?? 0 })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const row = {
    canal: body.canal || 'email',
    direccion: body.direccion || 'saliente',
    de_nombre: body.de_nombre ?? null,
    de_email: body.de_email ?? null,
    para: body.para ?? null,
    asunto: body.asunto ?? null,
    cuerpo: body.cuerpo ?? null,
    leido: body.leido ?? true,
    estrella: false,
    folder: body.folder || 'enviados',
  }
  const { data, error } = await supabase.from('comunicacion_mensajes').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
