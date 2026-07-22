import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCommSettingsRaw } from '@/lib/comm-settings'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

export const maxDuration = 60

const MAX_MESSAGES = 15

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const saved = await getCommSettingsRaw()
  const host = saved.imap_host
  const port = Number(saved.imap_port || 993)
  const imapUser = saved.imap_user
  const pass = saved.imap_pass
  const secure = (saved.imap_ssl ?? 'true') === 'true'

  if (!host || !imapUser || !pass) {
    return NextResponse.json({ error: 'Falta configurar IMAP (servidor, usuario o contraseña) en Configuración.' }, { status: 400 })
  }

  const client = new ImapFlow({ host, port, secure, auth: { user: imapUser, pass }, logger: false, socketTimeout: 45000 })

  type Row = {
    canal: string; direccion: string; de_nombre: string | null; de_email: string | null
    para: string | null; asunto: string | null; cuerpo: string | null
    leido: boolean; folder: string; ext_id: string; created_at: string
  }
  const rows: Row[] = []

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      const total = client.mailbox && typeof client.mailbox === 'object' ? client.mailbox.exists : 0
      if (total > 0) {
        const start = Math.max(1, total - (MAX_MESSAGES - 1))
        for await (const msg of client.fetch(`${start}:*`, { envelope: true, source: true, flags: true })) {
          try {
            const parsed = await simpleParser(msg.source as Buffer)
            const fromAddr = parsed.from?.value?.[0]
            const extId = parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`
            const htmlText = typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, ' ') : ''
            const cuerpo = (parsed.text || htmlText || '').replace(/\s+/g, ' ').trim().slice(0, 4000)
            rows.push({
              canal: 'email',
              direccion: 'entrante',
              de_nombre: fromAddr?.name || fromAddr?.address || null,
              de_email: fromAddr?.address || null,
              para: imapUser,
              asunto: parsed.subject || '(sin asunto)',
              cuerpo,
              leido: Boolean(msg.flags && (msg.flags as Set<string>).has('\\Seen')),
              folder: 'bandeja',
              ext_id: extId,
              created_at: (parsed.date || new Date()).toISOString(),
            })
          } catch { /* skip unparseable message */ }
        }
      }
    } finally {
      lock.release()
    }
    await client.logout()
  } catch (err) {
    try { await client.logout() } catch {}
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo sincronizar el correo' }, { status: 200 })
  }

  let nuevos = 0
  if (rows.length > 0) {
    const extIds = rows.map(r => r.ext_id)
    const { data: existentes } = await supabase
      .from('comunicacion_mensajes')
      .select('ext_id')
      .eq('canal', 'email')
      .in('ext_id', extIds)
    const yaGuardados = new Set((existentes ?? []).map(e => e.ext_id))
    const nuevas = rows.filter(r => !yaGuardados.has(r.ext_id))
    nuevos = nuevas.length
    if (nuevas.length > 0) {
      const { error } = await supabase
        .from('comunicacion_mensajes')
        .upsert(nuevas, { onConflict: 'canal,ext_id', ignoreDuplicates: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, revisados: rows.length, nuevos })
}
