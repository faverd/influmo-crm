import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patch = await req.json().catch(() => ({}))
  const allowed: Record<string, unknown> = {}
  for (const key of ['leido', 'estrella', 'folder']) {
    if (key in patch) allowed[key] = patch[key]
  }
  const { error } = await supabase.from('comunicacion_mensajes').update(allowed).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
