import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCommSettingsRaw } from '@/lib/comm-settings'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, subject, body, html: rawHtml, appendSignature = true } = await req.json().catch(() => ({}))
  if (!to || !subject) return NextResponse.json({ error: 'Falta destinatario o asunto' }, { status: 400 })

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

  try {
    const transporter = nodemailer.createTransport({
      host: saved.smtp_host,
      port: Number(saved.smtp_port || 587),
      secure: saved.smtp_ssl === 'true',
      auth: { user: saved.smtp_user, pass: saved.smtp_pass },
    })
    await transporter.sendMail({
      from: saved.email_from ? `"${saved.email_from}" <${saved.smtp_user}>` : saved.smtp_user,
      to, subject, html,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo enviar el correo' }, { status: 500 })
  }

  const { data, error } = await supabase.from('comunicacion_mensajes').insert({
    canal: 'email',
    direccion: 'saliente',
    de_nombre: saved.email_from || saved.smtp_user,
    de_email: saved.smtp_user,
    para: to,
    asunto: subject,
    cuerpo: body || (rawHtml ? String(rawHtml).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000) : ''),
    leido: true,
    estrella: false,
    folder: 'enviados',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, mensaje: data })
}
