import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCommSettingsRaw, resolveSecret } from '@/lib/comm-settings'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const saved = await getCommSettingsRaw()
  const host = body.smtp_host || saved.smtp_host
  const port = Number(body.smtp_port || saved.smtp_port || 587)
  const smtpUser = body.smtp_user || saved.smtp_user
  const pass = resolveSecret(body.smtp_pass, saved, 'smtp_pass')
  const secure = String(body.smtp_ssl ?? saved.smtp_ssl) === 'true'

  if (!host || !smtpUser || !pass) {
    return NextResponse.json({ ok: false, error: 'Faltan datos: servidor, usuario o contraseña SMTP' }, { status: 400 })
  }

  try {
    const transporter = nodemailer.createTransport({
      host, port, secure, auth: { user: smtpUser, pass },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000,
    })
    await transporter.verify()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo conectar' }, { status: 200 })
  }
}
