import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('leads')
    .select('*, contacts(name, phone, ad_source)')
    .order('qualified_at', { ascending: false })
    .limit(100)

  return NextResponse.json(data ?? [])
}
