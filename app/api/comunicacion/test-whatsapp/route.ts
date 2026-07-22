import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCommSettingsRaw, resolveSecret } from '@/lib/comm-settings'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const saved = await getCommSettingsRaw()
  const provider = body.wa_provider || saved.wa_provider || 'cloud_api'

  if (provider === 'baileys') {
    const baileysUrl = body.baileys_url || process.env.BAILEYS_URL
    if (!baileysUrl) return NextResponse.json({ ok: false, error: 'Falta la URL del servidor Baileys' }, { status: 200 })
    try {
      const res = await fetch(`${baileysUrl}/health`, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return NextResponse.json({ ok: false, error: `Servidor respondió ${res.status}` }, { status: 200 })
      return NextResponse.json({ ok: true })
    } catch (err) {
      return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo conectar' }, { status: 200 })
    }
  }

  const phoneId = body.wa_phone_id || saved.wa_phone_id
  const token = resolveSecret(body.wa_token, saved, 'wa_token')
  if (!phoneId || !token) {
    return NextResponse.json({ ok: false, error: 'Faltan datos: Phone Number ID o Access Token' }, { status: 200 })
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ ok: false, error: data?.error?.message || 'Token o Phone Number ID inválidos' }, { status: 200 })
    return NextResponse.json({ ok: true, phone: data.display_phone_number, name: data.verified_name })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo conectar' }, { status: 200 })
  }
}
