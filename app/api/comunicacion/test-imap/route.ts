import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCommSettingsRaw, resolveSecret } from '@/lib/comm-settings'
import { ImapFlow } from 'imapflow'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const saved = await getCommSettingsRaw()
  const host = body.imap_host || saved.imap_host
  const port = Number(body.imap_port || saved.imap_port || 993)
  const imapUser = body.imap_user || saved.imap_user
  const pass = resolveSecret(body.imap_pass, saved, 'imap_pass')
  const secure = String(body.imap_ssl ?? saved.imap_ssl ?? 'true') === 'true'

  if (!host || !imapUser || !pass) {
    return NextResponse.json({ ok: false, error: 'Faltan datos: servidor, usuario o contraseña IMAP' }, { status: 400 })
  }

  const client = new ImapFlow({
    host, port, secure, auth: { user: imapUser, pass },
    logger: false, socketTimeout: 8000,
  })

  try {
    await client.connect()
    await client.logout()
    return NextResponse.json({ ok: true })
  } catch (err) {
    try { await client.logout() } catch {}
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo conectar' }, { status: 200 })
  }
}
