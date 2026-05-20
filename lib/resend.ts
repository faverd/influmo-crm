import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? 'placeholder')
}

const FROM = 'Influmo CRM <noreply@influmo.com>'

function getRecipients(): string[] {
  return (process.env.NOTIFY_EMAIL ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
}

interface HotLeadParams {
  contactPhone: string
  contactName: string | null
  reason: string
  previewMessages: string
}

export async function sendHotLeadAlert({ contactPhone, contactName, reason, previewMessages }: HotLeadParams) {
  const name = contactName || contactPhone
  await getResend().emails.send({
    from: FROM,
    to: getRecipients(),
    subject: `🔥 Lead HOT: ${name}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="background: #f5a623; color: white; padding: 16px 24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 20px;">🔥 Nuevo Lead HOT</h2>
        </div>
        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Contacto</p>
          <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">${name}</p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Teléfono</p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">${contactPhone}</p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Razón de calificación</p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">${reason}</p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Últimos mensajes</p>
          <pre style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 12px; color: #374151; white-space: pre-wrap;">${previewMessages}</pre>
        </div>
      </div>
    `,
  })
}

interface DigestParams {
  date: string
  hot: number
  warm: number
  cold: number
  leads: Array<{ name: string | null; phone: string; score: string; reason: string }>
}

export async function sendDailyDigest({ date, hot, warm, cold, leads }: DigestParams) {
  const rows = leads
    .map(l => `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">${l.name || l.phone}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">${l.phone}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; text-transform: uppercase; font-weight: 600; color: ${l.score === 'hot' ? '#ef4444' : l.score === 'warm' ? '#f5a623' : '#6b7280'}">${l.score}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">${l.reason}</td>
    </tr>`)
    .join('')

  await getResend().emails.send({
    from: FROM,
    to: getRecipients(),
    subject: `Resumen de leads — ${date}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 700px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111827;">Resumen de leads — ${date}</h2>
        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 24px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #ef4444;">${hot}</div>
            <div style="font-size: 12px; color: #6b7280;">HOT</div>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 24px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #f5a623;">${warm}</div>
            <div style="font-size: 12px; color: #6b7280;">WARM</div>
          </div>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 24px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #6b7280;">${cold}</div>
            <div style="font-size: 12px; color: #6b7280;">COLD</div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280;">Nombre</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280;">Teléfono</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280;">Score</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280;">Razón</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `,
  })
}
