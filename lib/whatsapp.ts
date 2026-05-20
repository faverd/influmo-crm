const BASE = `https://graph.facebook.com/v21.0`
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!

export async function sendTextMessage(to: string, text: string): Promise<string | null> {
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
  const data = await res.json()
  return data?.messages?.[0]?.id ?? null
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}
