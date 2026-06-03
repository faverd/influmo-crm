import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = createServiceClient()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const q = url.searchParams.get('q')

  let query = supabase.from('crm_contacts').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (status && status !== 'total') query = query.eq('status', status)
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)

  const { data, error, count } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Counts per status for the tabs
  const { data: all } = await supabase.from('crm_contacts').select('status')
  const counts = { total: all?.length ?? 0, nuevo: 0, en_progreso: 0, con_venta: 0, sin_venta: 0, esperando: 0 }
  for (const r of all ?? []) { const s = r.status as keyof typeof counts; if (s in counts) counts[s]++ }

  return NextResponse.json({ contacts: data ?? [], count: count ?? 0, counts })
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('crm_contacts').insert({
    name: body.name.trim(),
    email: body.email ?? '',
    phone: body.phone ?? '',
    contact_hours: body.contact_hours ?? '',
    status: body.status ?? 'nuevo',
    assigned_to: body.assigned_to ?? 'Administrador',
    source: body.source ?? '',
    note: body.note ?? '',
    attachments: body.attachments ?? [],
    first_contact: body.first_contact ?? new Date().toISOString(),
    last_interaction: new Date().toISOString(),
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: Request) {
  const body = await req.json()
  const supabase = createServiceClient()
  const { id, ...patch } = body
  patch.last_interaction = new Date().toISOString()
  const { data, error } = await supabase.from('crm_contacts').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const { id } = await req.json()
  const supabase = createServiceClient()
  const { error } = await supabase.from('crm_contacts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
