const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const express = require('express')
const axios = require('axios')
const QRCode = require('qrcode')
const pino = require('pino')

const app = express()
app.use(express.json())

const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || 'https://influmo-crm.vercel.app/api/webhook'
const PORT = process.env.PORT || 3001
const API_SECRET = process.env.API_SECRET || 'baileys-secret-2024'

let sock = null
let qrDataURL = null
let isConnected = false
let myNumber = ''

const logger = pino({ level: 'silent' })

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger,
    defaultQueryTimeoutMs: undefined,
    browser: ['Influmo CRM', 'Chrome', '1.0.0'],
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrDataURL = await QRCode.toDataURL(qr)
      console.log('[QR] Nuevo QR generado — visita /qr para escanearlo')
    }

    if (connection === 'close') {
      isConnected = false
      const code = (lastDisconnect?.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0
      const shouldReconnect = code !== DisconnectReason.loggedOut
      console.log('[WA] Conexión cerrada, código:', code, '— reconectando:', shouldReconnect)
      if (shouldReconnect) setTimeout(connectToWhatsApp, 3000)
    } else if (connection === 'open') {
      isConnected = true
      qrDataURL = null
      myNumber = sock.user?.id?.split(':')[0] || ''
      console.log('[WA] ✅ Conectado como', myNumber)
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue

      const remoteJid = msg.key.remoteJid || ''
      if (remoteJid.endsWith('@g.us')) continue // ignorar grupos

      const from = remoteJid.replace('@s.whatsapp.net', '')
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        ''

      if (!from || !text) continue

      console.log(`[MSG] De ${from}: ${text.slice(0, 60)}`)

      try {
        await axios.post(CRM_WEBHOOK_URL, {
          object: 'whatsapp_business_account',
          entry: [{
            id: 'baileys',
            changes: [{
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: myNumber,
                  phone_number_id: 'baileys'
                },
                contacts: [{
                  profile: { name: msg.pushName || from },
                  wa_id: from
                }],
                messages: [{
                  from,
                  id: msg.key.id || `baileys-${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: text }
                }]
              },
              field: 'messages'
            }]
          }]
        }, { timeout: 10000 })
        console.log(`[CRM] Mensaje de ${from} enviado al CRM`)
      } catch (err) {
        console.error('[CRM] Error al reenviar mensaje:', err.message)
      }
    }
  })
}

// ── Rutas ──────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', connected: isConnected, number: myNumber })
})

// JSON del QR para mostrarlo dentro del CRM (imagen data-URL lista para <img src>)
app.get('/qr.json', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.json({ connected: isConnected, qr: isConnected ? null : qrDataURL, number: myNumber })
})

app.get('/qr', (req, res) => {
  if (isConnected) {
    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>✅ WhatsApp conectado</h2>
        <p>Número: <strong>${myNumber}</strong></p>
      </body></html>
    `)
  }
  if (!qrDataURL) {
    return res.send(`
      <html><head><meta http-equiv="refresh" content="3"></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>⏳ Generando QR...</h2>
        <p>Recargando en 3 segundos</p>
      </body></html>
    `)
  }
  res.send(`
    <html><head><meta http-equiv="refresh" content="30"></head>
    <body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>📱 Escanea con WhatsApp</h2>
      <img src="${qrDataURL}" style="width:300px;height:300px">
      <p>WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
      <p style="color:#999;font-size:12px">QR se regenera cada 30s</p>
    </body></html>
  `)
})

app.post('/send', async (req, res) => {
  const { secret, to, message } = req.body

  if (secret !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!isConnected || !sock) {
    return res.status(503).json({ error: 'WhatsApp not connected' })
  }

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing to or message' })
  }

  try {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
    await sock.sendMessage(jid, { text: message })
    console.log(`[SEND] Enviado a ${to}: ${message.slice(0, 60)}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('[SEND] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`[SERVER] Baileys server iniciado en puerto ${PORT}`)
  connectToWhatsApp()
})
