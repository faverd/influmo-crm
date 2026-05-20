const BASE = `https://graph.facebook.com/v21.0`
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!

export async function sendTextMessage(to: string, text: string): Promise<string | null> {
  // Si está configurado el servidor Baileys, usarlo
  const baileysUrl = process.env.BAILEYS_URL
  if (baileysUrl) {
    try {
      const res = await fetch(`${baileysUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.BAILEYS_SECRET || 'baileys-secret-2024',
          to: normalizePhone(to),
          message: text,
        }),
      })
      const data = await res.json() as { ok?: boolean }
      return data.ok ? `baileys-${Date.now()}` : null
    } catch (err) {
      console.error('Baileys send error:', err)
      return null
    }
  }

  // Fallback: WhatsApp Business API oficial
  const res = await fetch(`${BASE}/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  if (!res.ok) {
    console.error('WhatsApp send error:', await res.text())
    return null
  }
  const data = await res.json() as { messages?: { id: string }[] }
  return data?.messages?.[0]?.id ?? null
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}
