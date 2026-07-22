import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCommSettingsRaw } from '@/lib/comm-settings'
import { buildTransporter, fromHeader } from '@/lib/mailer'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const saved = await getCommSettingsRaw()
  if (!saved.smtp_host || !saved.smtp_user || !saved.smtp_pass) {
    return NextResponse.json({ ok: false, error: 'Falta configurar el servidor SMTP.' }, { status: 200 })
  }
  const to = (body.to || saved.smtp_user || '').trim()
  if (!to) return NextResponse.json({ ok: false, error: 'Indica un destinatario de prueba.' }, { status: 200 })

  try {
    const transporter = buildTransporter(saved)
    const info = await transporter.sendMail({
      from: fromHeader(saved),
      replyTo: saved.smtp_user,
      to,
      subject: 'Prueba de envío · CRM',
      text: `Este es un correo de prueba enviado desde tu CRM (${saved.smtp_user}). Si lo recibes, el envío funciona. Revisa también la carpeta de spam.`,
    })
    const accepted = (info.accepted || []).map(a => (typeof a === 'string' ? a : a.address))
    const rejected = (info.rejected || []).map(a => (typeof a === 'string' ? a : a.address))
    return NextResponse.json({
      ok: accepted.length > 0,
      to,
      accepted, rejected,
      response: info.response ?? null,
      messageId: info.messageId ?? null,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo enviar' }, { status: 200 })
  }
}
