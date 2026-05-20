import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const today = new Date()
  const dayStart = new Date(today)
  dayStart.setUTCHours(0, 0, 0, 0)

  const { data: leads } = await db
    .from('leads')
    .select('score')
    .gte('qualified_at', dayStart.toISOString())

  const hot = leads?.filter(l => l.score === 'hot').length ?? 0
  const warm = leads?.filter(l => l.score === 'warm').length ?? 0
  const cold = leads?.filter(l => l.score === 'cold').length ?? 0

  console.log(`[DAILY] Leads hoy — HOT: ${hot}, WARM: ${warm}, COLD: ${cold}`)

  return NextResponse.json({ ok: true, hot, warm, cold, total: (leads?.length ?? 0) })
}
