import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCommSettingsRaw } from '@/lib/comm-settings'
import { buildTransporter } from '@/lib/mailer'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, subject, body, html: rawHtml, appendSignature = true, attachments } = await req.json().catch(() => ({}))
  if (!to || !subject) return NextResponse.json({ error: 'Falta destinatario o asunto' }, { status: 400 })
  const atts: { name: string; url: string; type?: string }[] = Array.isArray(attachments) ? attachments.filter(a => a?.url) : []

  const saved = await getCommSettingsRaw()

  if (saved.email_enabled !== 'true') {
    return NextResponse.json({ error: 'El envío de correos no está activado en Comunicación → Configuración.' }, { status: 400 })
  }
  if (!saved.smtp_host || !saved.smtp_user || !saved.smtp_pass) {
    return NextResponse.json({ error: 'Falta configurar el servidor SMTP en Comunicación → Configuración.' }, { status: 400 })
  }

  // If pre-rendered HTML is supplied (e.g. a template document), send it as-is;
  // otherwise build HTML from the plain-text body and optionally append the signature.
  const html = rawHtml
    ? rawHtml
    : appendSignature && saved.signature_html
      ? `<div>${(body || '').replace(/\n/g, '<br/>')}</div><br/>${saved.signature_html}`
      : (body || '').replace(/\n/g, '<br/>')

  let info: { accepted?: (string | { address: string })[]; rejected?: (string | { address: string })[]; response?: string }
  try {
    const transporter = buildTransporter(saved)
    info = await transporter.sendMail({
      from: saved.email_from ? `"${saved.email_from}" <${saved.smtp_user}>` : saved.smtp_user,
      replyTo: saved.smtp_user,
      to, subject, html,
      attachments: atts.map(a => ({ filename: a.name, path: a.url })),
    })
    // If the server accepted no recipients, treat as a failure rather than a silent "sent".
    if (info.accepted && info.accepted.length === 0) {
      return NextResponse.json({ error: `El servidor no aceptó el destinatario. Respuesta: ${info.response || 'sin detalle'}` }, { status: 502 })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo enviar el correo' }, { status: 500 })
  }

  const { data, error } = await supabase.from('comunicacion_mensajes').insert({
    canal: 'email',
    direccion: 'saliente',
    de_nombre: saved.email_from || saved.smtp_user,
    de_email: saved.smtp_user,
    para: to,
    to_nombre: to,
    asunto: subject,
    cuerpo: String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
    cuerpo_html: html,
    attachments: atts,
    leido: true,
    estrella: false,
    folder: 'enviados',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, mensaje: data, smtp: info.response ?? null })
}
