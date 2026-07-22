import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { UBICACION_COLS } from '@/lib/geo'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createServiceClient()
  const { data, error } = await db.from('ubicaciones_comerciales').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const row: Record<string, unknown> = {}
  for (const c of UBICACION_COLS) if (c in body) row[c] = body[c]
  // Compatibilidad: mantener 'cliente' y 'ciudad' sincronizados
  if (body.cliente_nombre && !('cliente' in row)) row.cliente = body.cliente_nombre
  if (body.departamento && !('ciudad' in row)) row.ciudad = [body.distrito, body.departamento].filter(Boolean).join(', ')
  const db = createServiceClient()
  const { data, error } = await db.from('ubicaciones_comerciales').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const db = createServiceClient()
  const { error } = await db.from('ubicaciones_comerciales').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
