import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const FOLDERS = ['bandeja', 'enviados', 'archivo', 'borradores', 'spam', 'papelera']

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(req: NextRequest) {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createServiceClient()
  const sp = req.nextUrl.searchParams

  if (sp.get('counts') === '1') {
    const { data } = await db.from('comunicacion_mensajes').select('folder, estrella')
    const counts: Record<string, number> = {}
    for (const f of FOLDERS) counts[f] = 0
    counts.destacados = 0
    for (const r of data ?? []) {
      if (r.folder && counts[r.folder] !== undefined) counts[r.folder]++
      if (r.estrella && r.folder !== 'papelera') counts.destacados++
    }
    return NextResponse.json(counts)
  }

  const folder = sp.get('folder') || 'bandeja'
  const label = sp.get('label') || ''
  const q = sp.get('q') || ''
  const limit = Number(sp.get('limit') || 200)

  let query = db.from('comunicacion_mensajes').select('*').order('created_at', { ascending: false }).limit(limit)
  if (folder === 'destacados') query = query.eq('estrella', true).neq('folder', 'papelera')
  else query = query.eq('folder', folder)
  if (label) query = query.eq('label', label)
  if (q) query = query.or(`asunto.ilike.%${q}%,de_nombre.ilike.%${q}%,de_email.ilike.%${q}%,cuerpo.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count } = await db.from('comunicacion_mensajes').select('id', { count: 'exact', head: true }).eq('folder', 'bandeja').eq('leido', false)
  return NextResponse.json({ mensajes: data ?? [], unread_count: count ?? 0 })
}

const WRITABLE = ['direccion', 'de_nombre', 'de_email', 'para', 'to_nombre', 'asunto', 'cuerpo', 'cuerpo_html', 'leido', 'estrella', 'folder', 'label', 'attachments']

export async function POST(req: NextRequest) {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const db = createServiceClient()

  const patch: Record<string, unknown> = {}
  for (const k of WRITABLE) if (k in body) patch[k] = body[k]

  if (body.id) {
    const { data, error } = await db.from('comunicacion_mensajes').update(patch).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
  const { data, error } = await db.from('comunicacion_mensajes').insert({ canal: 'email', ...patch }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const db = createServiceClient()

  if (req.nextUrl.searchParams.get('hard') === '1') {
    const { error } = await db.from('comunicacion_mensajes').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await db.from('comunicacion_mensajes').update({ folder: 'papelera' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
