import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCommSettingsRaw } from '@/lib/comm-settings'
import { ImapFlow } from 'imapflow'
import { simpleParser, type AddressObject } from 'mailparser'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_MESSAGES = 15
const MAX_ATTACH_BYTES = 12 * 1024 * 1024
const BUCKET = 'bot-documents'

type Att = { filename: string; mime: string; size: number; content: Buffer; cid?: string; inline: boolean }
type Extra = { html: string | null; text: string; atts: Att[] }

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
  const extras = new Map<string, Extra>()
  const contactsByEmail = new Map<string, { email: string; nombre: string | null }>()

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
            const fromAddr = (parsed.from as AddressObject | undefined)?.value?.[0]
            const extId = parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`
            const text = (parsed.text || '').trim()
            const htmlText = typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, ' ') : ''
            const preview = (text || htmlText).replace(/\s+/g, ' ').trim().slice(0, 400)
            rows.push({
              canal: 'email', direccion: 'entrante',
              de_nombre: fromAddr?.name || fromAddr?.address || null,
              de_email: fromAddr?.address || null,
              para: imapUser, asunto: parsed.subject || '(sin asunto)', cuerpo: preview,
              leido: Boolean(msg.flags && (msg.flags as Set<string>).has('\\Seen')),
              folder: 'bandeja', ext_id: extId, created_at: (parsed.date || new Date()).toISOString(),
            })
            const atts: Att[] = (parsed.attachments || [])
              .filter(a => (a.size ?? a.content?.length ?? 0) <= MAX_ATTACH_BYTES && a.content)
              .map(a => ({
                filename: a.filename || `adjunto-${(a.cid || 'x').slice(0, 6)}`,
                mime: a.contentType || 'application/octet-stream',
                size: a.size ?? (a.content?.length ?? 0),
                content: a.content as Buffer,
                cid: a.cid ? a.cid.replace(/[<>]/g, '') : undefined,
                inline: Boolean(a.related || a.cid),
              }))
            extras.set(extId, { html: typeof parsed.html === 'string' ? parsed.html : null, text, atts })
            if (fromAddr?.address) {
              const em = fromAddr.address.toLowerCase()
              if (!contactsByEmail.has(em)) contactsByEmail.set(em, { email: em, nombre: fromAddr.name || null })
            }
          } catch { /* skip unparseable */ }
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

  const db = createServiceClient()
  let nuevos = 0
  let adjuntos = 0

  async function upload(a: Att): Promise<string | null> {
    const safe = a.filename.replace(/[^\w.\-]/g, '_')
    const path = `comunicacion/adjuntos/${Date.now()}-${Math.round(Math.max(1, a.size))}-${safe}`
    const { error } = await db.storage.from(BUCKET).upload(path, a.content, { contentType: a.mime, upsert: true })
    if (error) return null
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  if (rows.length > 0) {
    const extIds = rows.map(r => r.ext_id)
    const { data: existentes } = await db.from('comunicacion_mensajes').select('ext_id').eq('canal', 'email').in('ext_id', extIds)
    const yaGuardados = new Set((existentes ?? []).map(e => e.ext_id))
    const nuevas = rows.filter(r => !yaGuardados.has(r.ext_id))

    for (const row of nuevas) {
      const ex = extras.get(row.ext_id)
      let html = ex?.html ?? null
      const attachmentsArr: { name: string; url: string; type: string }[] = []

      if (ex) {
        // Sube inline (imágenes embebidas) y reemplaza cid: por su URL pública → estilo Gmail
        for (const a of ex.atts.filter(x => x.inline)) {
          const url = await upload(a)
          if (url && a.cid && html) html = html.split(`cid:${a.cid}`).join(url)
          else if (url && a.cid === undefined && a.mime.startsWith('image/') && html === null) { /* no html */ }
        }
        // Sube adjuntos reales (con nombre de archivo) → miniaturas + tabla archivos
        for (const a of ex.atts.filter(x => !x.inline && x.filename)) {
          const url = await upload(a)
          if (url) attachmentsArr.push({ name: a.filename, url, type: a.mime })
        }
      }

      const { data: inserted, error } = await db.from('comunicacion_mensajes')
        .insert({ ...row, cuerpo_html: html, attachments: attachmentsArr })
        .select('id').single()
      if (error || !inserted) continue
      nuevos++

      for (const a of attachmentsArr) {
        const { error: insErr } = await db.from('comunicacion_archivos').insert({
          nombre: a.name, mime: a.type, size: 0, url: a.url, storage_path: null,
          direccion: 'entrante', mensaje_id: inserted.id,
        })
        if (!insErr) adjuntos++
      }
    }
  }

  if (contactsByEmail.size > 0) {
    const contactRows = Array.from(contactsByEmail.values()).map(c => ({ email: c.email, nombre: c.nombre, origen: 'correo' }))
    await db.from('comunicacion_contactos').upsert(contactRows, { onConflict: 'email', ignoreDuplicates: true })
  }

  return NextResponse.json({ ok: true, revisados: rows.length, nuevos, adjuntos })
}
