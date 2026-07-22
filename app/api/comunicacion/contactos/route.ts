import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createServiceClient()
  const { data, error } = await db.from('comunicacion_contactos').select('*').order('nombre', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (!b.email?.trim()) return NextResponse.json({ error: 'El email es obligatorio' }, { status: 400 })
  const db = createServiceClient()
  const { data, error } = await db.from('comunicacion_contactos').upsert({
    nombre: b.nombre?.trim() || b.email.trim(),
    email: b.email.trim().toLowerCase(),
    empresa: b.empresa?.trim() || null,
    telefono: b.telefono?.trim() || null,
    origen: b.origen || 'manual',
  }, { onConflict: 'email' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const db = createServiceClient()
  const { error } = await db.from('comunicacion_contactos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
