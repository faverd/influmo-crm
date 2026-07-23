import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Fábrica de endpoints CRUD para tablas de Registros (auth Supabase).
// `columns` = lista blanca de campos aceptados (sanitización de entrada).
export function makeCrud(table: string, columns: string[], requiredCol: string, orderBy = 'created_at') {
  async function requireUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  async function GET() {
    if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = createServiceClient()
    const { data, error } = await db.from(table).select('*').order(orderBy, { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  async function POST(req: NextRequest) {
    if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json().catch(() => ({}))
    if (!String(body[requiredCol] ?? '').trim()) {
      return NextResponse.json({ error: `El campo ${requiredCol} es obligatorio` }, { status: 400 })
    }
    const payload: Record<string, unknown> = {}
    for (const c of columns) if (c in body) payload[c] = body[c] === '' ? null : body[c]

    const db = createServiceClient()
    if (body.id) {
      const { data, error } = await db.from(table).update(payload).eq('id', body.id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }
    const { data, error } = await db.from(table).insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  async function DELETE(req: NextRequest) {
    if (!await requireUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
    const db = createServiceClient()
    const { error } = await db.from(table).delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return { GET, POST, DELETE }
}
