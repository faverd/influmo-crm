import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function baileysBase() {
  const u = process.env.BAILEYS_URL
  return u ? u.replace(/\/$/, '') : ''
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const base = baileysBase()
  let baileysConnected = false
  let number = ''
  if (base) {
    try {
      const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(6000) })
      if (r.ok) { const d = await r.json(); baileysConnected = !!d.connected; number = d.number || '' }
    } catch { /* server down / warming up */ }
  }

  const cloudConfigured = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN)
  const method = baileysConnected ? 'baileys' : cloudConfigured ? 'cloud' : base ? 'baileys_pending' : 'none'

  return NextResponse.json({
    connected: baileysConnected || cloudConfigured,
    method,
    baileys_configured: Boolean(base),
    baileys_connected: baileysConnected,
    number,
    phone_number_id: cloudConfigured ? process.env.WHATSAPP_PHONE_NUMBER_ID : null,
    webhook_verify_token_set: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
  })
}
