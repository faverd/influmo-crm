'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, X, Send, Loader2, Paperclip, Check, AlertTriangle } from 'lucide-react'
import { registerMailComposeListener, type MailComposeRequest, type MailAttachment } from '@/lib/mail-compose'

// Centered composer mounted once in the root layout. Sends through the CRM's
// configured SMTP account (Comunicación → Configuración) via /api/comunicacion/send,
// so every "Correo" action in the system goes out from the company mailbox.
export default function MailComposeHost() {
  const [req, setReq] = useState<MailComposeRequest | null>(null)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [atts, setAtts] = useState<MailAttachment[]>([])
  const [sending, setSending] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [account, setAccount] = useState('')

  useEffect(() => {
    registerMailComposeListener(r => {
      setReq(r)
      setTo(r.to ?? '')
      setSubject(r.subject ?? '')
      setBody(r.body ?? '')
      setAtts(r.attachments ?? [])
      setResult(null)
      // Upload a client-generated blob (e.g. a PDF) so it can be attached.
      if (r.attachBlob) {
        setPreparing(true)
        const fd = new FormData()
        fd.append('file', new File([r.attachBlob.blob], r.attachBlob.filename, { type: r.attachBlob.blob.type || 'application/pdf' }))
        fetch('/api/comunicacion/upload', { method: 'POST', body: fd })
          .then(res => res.ok ? res.json() : null)
          .then(j => { if (j?.url) setAtts(prev => [...prev, { name: j.name, url: j.url, type: j.type }]) })
          .catch(() => {})
          .finally(() => setPreparing(false))
      }
    })
    return () => registerMailComposeListener(null)
  }, [])

  useEffect(() => {
    if (!req) return
    fetch('/api/comunicacion/settings').then(r => r.json()).then(s => setAccount(s?.smtp_user || '')).catch(() => {})
  }, [req])

  function close() { setReq(null); setSending(false); setResult(null); setAtts([]) }

  async function send() {
    if (!to.trim()) { setResult({ ok: false, msg: 'Indica un destinatario.' }); return }
    if (!subject.trim()) { setResult({ ok: false, msg: 'Indica un asunto.' }); return }
    setSending(true); setResult(null)
    try {
      const r = await fetch('/api/comunicacion/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body, attachments: atts }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setResult({ ok: true, msg: 'Correo enviado y guardado en Enviados.' })
        setTimeout(close, 1400)
      } else {
        setResult({ ok: false, msg: d.error || 'No se pudo enviar el correo.' })
      }
    } catch {
      setResult({ ok: false, msg: 'Error de red al enviar.' })
    } finally { setSending(false) }
  }

  if (!req) return null

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-3 sm:p-4" onClick={close}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Mail size={16} className="text-brand" />
          <h2 className="font-semibold text-gray-900 text-sm">Enviar correo</h2>
          <button onClick={close} className="ml-auto text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {account && <p className="text-[11px] text-gray-400">Se enviará desde <span className="font-medium text-gray-600">{account}</span></p>}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Para</label>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="destinatario@correo.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Asunto</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Mensaje</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={8}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none" />
          </div>

          {(preparing || atts.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {preparing && <span className="flex items-center gap-1.5 text-xs text-gray-400"><Loader2 size={12} className="animate-spin" /> Preparando adjunto…</span>}
              {atts.map((a, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600">
                  <Paperclip size={11} /> <span className="max-w-[160px] truncate">{a.name}</span>
                  <button onClick={() => setAtts(p => p.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><X size={11} /></button>
                </span>
              ))}
            </div>
          )}

          {result && (
            <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {result.ok ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
              <div>
                <p>{result.msg}</p>
                {!result.ok && /activado|SMTP|configurar/i.test(result.msg) && (
                  <Link href="/comunicacion/configuracion" onClick={close} className="underline font-medium">Ir a Comunicación → Configuración</Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100">
          <button onClick={close} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={send} disabled={sending || preparing}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
