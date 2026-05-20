import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const score = searchParams.get('score') ?? ''

  let query = supabase
    .from('contacts')
    .select(`
      id, phone, name, created_at, ad_source, blocked, bot_active,
      messages(content, created_at, role),
      leads(score, reason, qualified_at)
    `)
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`phone.ilike.%${q}%,name.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const conversations = (data ?? []).map(c => {
    const msgs = (c.messages as { content: string; created_at: string; role: string }[]) ?? []
    const sorted = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const lastMsg = sorted[0]
    const leads = (c.leads as { score: string }[]) ?? []
    const latestLead = leads.length > 0 ? leads[leads.length - 1] : null

    return {
      id: c.id,
      phone: c.phone,
      name: c.name,
      created_at: c.created_at,
      ad_source: c.ad_source,
      blocked: c.blocked,
      bot_active: c.bot_active,
      last_message: lastMsg?.content ?? null,
      last_message_at: lastMsg?.created_at ?? null,
      last_message_role: lastMsg?.role ?? null,
      message_count: msgs.length,
      lead_score: latestLead?.score ?? null,
    }
  })

  const filtered = score
    ? conversations.filter(c => c.lead_score === score)
    : conversations

  return NextResponse.json(filtered)
}
