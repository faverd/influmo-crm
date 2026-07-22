import nodemailer from 'nodemailer'
import type { CommSettingsRaw } from '@/lib/comm-settings'

// Builds a hardened SMTP transporter from saved comm settings.
// - secure (implicit TLS) on 465; STARTTLS otherwise
// - rejectUnauthorized:false tolerates the self-signed / hostname-mismatched
//   certs common on shared cPanel/Exim hosting (e.g. server hostname differs
//   from the mail domain), which would otherwise fail the handshake.
export function buildTransporter(saved: CommSettingsRaw) {
  const port = Number(saved.smtp_port || 587)
  const secure = saved.smtp_ssl === 'true' || port === 465
  return nodemailer.createTransport({
    host: saved.smtp_host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user: saved.smtp_user, pass: saved.smtp_pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })
}

export function fromHeader(saved: CommSettingsRaw) {
  return saved.email_from ? `"${saved.email_from}" <${saved.smtp_user}>` : saved.smtp_user
}
