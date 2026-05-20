import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    { count: totalContacts },
    { count: todayMessages },
    { data: leadData },
    { data: recentMessages },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    supabase.from('leads').select('score, qualified_at').gte('qualified_at', monthStart.toISOString()),
    supabase.from('messages').select('created_at, role').gte('created_at', weekStart.toISOString()).order('created_at', { ascending: true }),
  ])

  const leads = leadData ?? []
  const hot = leads.filter(l => l.score === 'hot').length
  const warm = leads.filter(l => l.score === 'warm').length
  const cold = leads.filter(l => l.score === 'cold').length

  // Agrupar mensajes por día para el chart
  const msgMap: Record<string, { user: number; assistant: number }> = {}
  for (const m of recentMessages ?? []) {
    const day = m.created_at.slice(0, 10)
    if (!msgMap[day]) msgMap[day] = { user: 0, assistant: 0 }
    msgMap[day][m.role as 'user' | 'assistant']++
  }
  const chartData = Object.entries(msgMap).map(([date, v]) => ({ date, ...v }))

  return NextResponse.json({
    totalContacts: totalContacts ?? 0,
    todayMessages: todayMessages ?? 0,
    leads: { hot, warm, cold, total: leads.length },
    chartData,
  })
}
