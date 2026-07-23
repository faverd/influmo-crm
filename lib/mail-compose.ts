// Global "compose & send email" trigger. Any component can call composeEmail()
// to open a centered composer that sends through the CRM's configured SMTP
// account (Comunicación → Configuración), instead of the browser's mailto:.

export interface MailAttachment { name: string; url: string; type?: string }
export interface MailComposeRequest {
  to?: string
  subject?: string
  body?: string
  attachments?: MailAttachment[]
  // A client-generated blob to upload and attach before sending (e.g. a PDF).
  attachBlob?: { blob: Blob; filename: string }
}

let listener: ((req: MailComposeRequest) => void) | null = null

export function registerMailComposeListener(fn: ((req: MailComposeRequest) => void) | null) {
  listener = fn
}

export function composeEmail(req: MailComposeRequest = {}) {
  if (listener) { listener(req); return }
  // Fallback if the host isn't mounted yet.
  if (typeof window !== 'undefined') {
    window.location.href = `mailto:${req.to ?? ''}?subject=${encodeURIComponent(req.subject ?? '')}&body=${encodeURIComponent(req.body ?? '')}`
  }
}
