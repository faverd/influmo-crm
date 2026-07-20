import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('facturas').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { count } = await supabase.from('facturas').select('*', { count: 'exact', head: true })
  const numero = `FAC-${String((count ?? 0) + 1).padStart(4, '0')}`
  const items = body.items ?? []
  const subtotal = items.reduce((s: number, i: { cantidad: number; precio_unitario: number }) => s + i.cantidad * i.precio_unitario, 0)
  const igv = parseFloat((subtotal * 0.18).toFixed(2))
  const total = parseFloat((subtotal + igv).toFixed(2))
  const { data, error } = await supabase.from('facturas').insert({ ...body, numero, subtotal, igv, total }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
