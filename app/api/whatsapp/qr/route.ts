import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Proxies the QR / link state from the (self-hosted) Baileys server so the user
// can scan it inside the CRM. BAILEYS_URL stays server-side.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const base = process.env.BAILEYS_URL?.replace(/\/$/, '')
  if (!base) return NextResponse.json({ configured: false, connected: false, qr: null })

  try {
    const r = await fetch(`${base}/qr.json`, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return NextResponse.json({ configured: true, connected: false, qr: null, error: `Servidor respondió ${r.status}` })
    const d = await r.json()
    return NextResponse.json({ configured: true, connected: !!d.connected, qr: d.qr ?? null, number: d.number ?? '' })
  } catch {
    return NextResponse.json({ configured: true, connected: false, qr: null, error: 'No se pudo contactar el servidor de WhatsApp (¿está arrancando?)' })
  }
}
