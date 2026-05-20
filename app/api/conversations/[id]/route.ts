import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [{ data: contact }, { data: messages }, { data: leads }] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', id).single(),
    supabase.from('messages').select('*').eq('contact_id', id).order('created_at', { ascending: true }),
    supabase.from('leads').select('*').eq('contact_id', id).order('qualified_at', { ascending: false }).limit(1),
  ])

  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ contact, messages: messages ?? [], lead: leads?.[0] ?? null })
}
