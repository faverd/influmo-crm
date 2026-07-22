import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = 'bot-documents'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createServiceClient()
  const { data, error } = await db.from('comunicacion_archivos').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Falta archivo' }, { status: 400 })
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Máximo 15 MB' }, { status: 400 })

  const db = createServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const safe = file.name.replace(/[^\w.\-]/g, '_')
  const path = `comunicacion/adjuntos/${Date.now()}-${safe}`

  const { error: upErr } = await db.storage.from(BUCKET).upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: true })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path)

  const { data, error } = await db.from('comunicacion_archivos').insert({
    nombre: file.name, mime: file.type || null, size: file.size,
    url: urlData.publicUrl, storage_path: path, direccion: 'saliente',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const db = createServiceClient()
  const { data: row } = await db.from('comunicacion_archivos').select('storage_path').eq('id', id).single()
  if (row?.storage_path) await db.storage.from(BUCKET).remove([row.storage_path])
  const { error } = await db.from('comunicacion_archivos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
