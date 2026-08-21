import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Keep-alive: a tiny daily read so the (free-tier) Supabase project keeps
// receiving traffic and does not auto-pause after ~7 idle days. Intentionally
// unauthenticated and harmless (touches one row, returns no data) so it works
// from Vercel Cron and from an external uptime pinger alike.
export async function GET() {
  try {
    const db = createServiceClient()
    const { error } = await db.from('settings').select('key', { head: true, count: 'exact' }).limit(1)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 200 })
  }
}
