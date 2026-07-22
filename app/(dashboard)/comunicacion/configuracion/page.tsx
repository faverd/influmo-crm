'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mail, Server, KeyRound, Save, Check, X, Loader2, RefreshCw,
  MessageSquareText, ShieldCheck, AlertTriangle, Bold, Italic, Underline,
  Link2, Eraser, Sparkles, IdCard, Type as TypeIcon, PlugZap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { alertDialog } from '@/lib/dialogs'

const MASK = '__unchanged__'
type Tab = 'correo' | 'whatsapp' | 'integracion'

type Form = {
  email_provider: string; email_from: string
  smtp_host: string; smtp_port: string; smtp_user: string; smtp_pass: string; smtp_ssl: string
  imap_host: string; imap_port: string; imap_user: string; imap_pass: string; imap_ssl: string
  signature_html: string; email_enabled: string
  wa_provider: string; wa_phone_id: string; wa_number: string; wa_token: string; wa_enabled: string
}
const EMPTY: Form = {
  email_provider: 'smtp', email_from: 'Decoraciones Interiores',
  smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_ssl: 'true',
  imap_host: '', imap_port: '993', imap_user: '', imap_pass: '', imap_ssl: 'true',
  signature_html: '', email_enabled: 'false',
  wa_provider: 'cloud_api', wa_phone_id: '', wa_number: '', wa_token: '', wa_enabled: 'false',
}

const SIGNATURE_PRESETS: Record<string, string> = {
  profesional: `<div style="font-family:Arial,sans-serif;font-size:13px;color:#374151;line-height:1.5"><p style="margin:0 0 4px;font-weight:700;color:#111827">Equipo Decoraciones Interiores</p><p style="margin:0 0 8px;color:#6b7280">Diseño y decoración de interiores</p><p style="margin:0">📞 +51 1 234-5678 &nbsp;|&nbsp; ✉️ marketing@decorinteriores.pe</p><p style="margin:0">🌐 www.decorinteriores.pe</p></div>`,
  simple: `<p style="font-family:Arial,sans-serif;font-size:13px;color:#374151;margin:0">Saludos cordiales,<br/>Equipo Decoraciones Interiores</p>`,
  eslogan: `<div style="font-family:Arial,sans-serif;font-size:13px;color:#374151;line-height:1.5"><p style="margin:0 0 2px;font-weight:700;color:#111827">Decoraciones Interiores</p><p style="margin:0 0 8px;font-style:italic;color:#0d9488">&quot;Transformamos espacios en experiencias&quot;</p><p style="margin:0">+51 1 234-5678 · marketing@decorinteriores.pe</p></div>`,
  tarjeta: `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#374151"><tr><td style="padding-right:12px"><div style="width:42px;height:42px;border-radius:50%;background:#0d9488;color:#fff;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center">DI</div></td><td style="border-left:2px solid #0d9488;padding-left:12px"><p style="margin:0;font-weight:700;color:#111827">Equipo Decoraciones Interiores</p><p style="margin:0;color:#6b7280">Diseño y decoración de interiores</p><p style="margin:2px 0 0">+51 1 234-5678 · marketing@decorinteriores.pe</p></td></tr></table>`,
}

function StatusBadge({ ok, unknown }: { ok: boolean; unknown?: boolean }) {
  if (unknown) return <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500"><Loader2 size={11} className="animate-spin" /> Verificando</span>
  return ok ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700"><ShieldCheck size={12} /> Configurado</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500"><AlertTriangle size={12} /> Desconectado</span>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', checked ? 'bg-brand' : 'bg-gray-200')}>
      <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', checked ? 'left-6' : 'left-1')} />
    </button>
  )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
      <input {...props}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
    </div>
  )
}

export default function ComunicacionConfigPage() {
  const [tab, setTab] = useState<Tab>('correo')
  const [form, setForm] = useState<Form>(EMPTY)
  const [secretsSet, setSecretsSet] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [testingImap, setTestingImap] = useState(false)
  const [testingWa, setTestingWa] = useState(false)
  const [smtpResult, setSmtpResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [imapResult, setImapResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [waResult, setWaResult] = useState<{ ok: boolean; error?: string; phone?: string } | null>(null)
  const [waStatus, setWaStatus] = useState<{ connected: boolean; webhook_verify_token_set: boolean } | null>(null)
  const sigRef = useRef<HTMLDivElement>(null)

  const set = (key: keyof Form, value: string) => setForm(f => ({ ...f, [key]: value }))

  useEffect(() => {
    Promise.all([
      fetch('/api/comunicacion/settings').then(r => r.json()),
      fetch('/api/whatsapp/status').then(r => r.json()).catch(() => null),
    ]).then(([s, wa]) => {
      if (s && !s.error) {
        setForm(f => ({ ...f, ...s, smtp_pass: '', imap_pass: '', wa_token: '' }))
        setSecretsSet(s.secretsSet || {})
        setTimeout(() => { if (sigRef.current) sigRef.current.innerHTML = s.signature_html || '' }, 0)
      }
      if (wa) setWaStatus(wa)
      setLoading(false)
    })
  }, [])

  const smtpConfigured = Boolean(form.smtp_host && form.smtp_user && (secretsSet.smtp_pass || form.smtp_pass))
  const imapConfigured = Boolean(form.imap_host && form.imap_user && (secretsSet.imap_pass || form.imap_pass))
  const waConfigured = Boolean(waStatus?.connected || (form.wa_phone_id && (secretsSet.wa_token || form.wa_token)))

  async function save() {
    setSaving(true)
    setForm(f => ({ ...f, signature_html: sigRef.current?.innerHTML ?? f.signature_html }))
    const payload: Record<string, string> = { ...form, signature_html: sigRef.current?.innerHTML ?? form.signature_html }
    payload.smtp_pass = form.smtp_pass || (secretsSet.smtp_pass ? MASK : '')
    payload.imap_pass = form.imap_pass || (secretsSet.imap_pass ? MASK : '')
    payload.wa_token = form.wa_token || (secretsSet.wa_token ? MASK : '')
    const r = await fetch('/api/comunicacion/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    setSaving(false)
    if (r.ok) {
      setSaved(true); setTimeout(() => setSaved(false), 2500)
      const s = await fetch('/api/comunicacion/settings').then(res => res.json())
      setSecretsSet(s.secretsSet || {})
      setForm(f => ({ ...f, smtp_pass: '', imap_pass: '', wa_token: '' }))
    } else {
      const d = await r.json().catch(() => ({}))
      await alertDialog(d.error || 'No se pudo guardar la configuración')
    }
  }

  async function testSmtp() {
    setTestingSmtp(true); setSmtpResult(null)
    const r = await fetch('/api/comunicacion/test-smtp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtp_host: form.smtp_host, smtp_port: form.smtp_port, smtp_user: form.smtp_user, smtp_pass: form.smtp_pass || MASK, smtp_ssl: form.smtp_ssl }),
    })
    const d = await r.json()
    setSmtpResult(d); setTestingSmtp(false)
  }
  async function testImap() {
    setTestingImap(true); setImapResult(null)
    const r = await fetch('/api/comunicacion/test-imap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imap_host: form.imap_host, imap_port: form.imap_port, imap_user: form.imap_user, imap_pass: form.imap_pass || MASK, imap_ssl: form.imap_ssl }),
    })
    const d = await r.json()
    setImapResult(d); setTestingImap(false)
  }
  async function testWhatsapp() {
    setTestingWa(true); setWaResult(null)
    const r = await fetch('/api/comunicacion/test-whatsapp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wa_provider: form.wa_provider, wa_phone_id: form.wa_phone_id, wa_token: form.wa_token || MASK }),
    })
    const d = await r.json()
    setWaResult(d); setTestingWa(false)
  }

  function applyPreset(key: string) {
    if (sigRef.current) sigRef.current.innerHTML = key === 'vaciar' ? '' : SIGNATURE_PRESETS[key]
  }
  function exec(cmd: string) {
    document.execCommand(cmd)
    sigRef.current?.focus()
  }
  function insertLink() {
    const url = window.prompt('URL del enlace:')
    if (url) document.execCommand('createLink', false, url)
  }

  const TABS: { key: Tab; label: string; icon: typeof Mail }[] = [
    { key: 'correo', label: 'Correo', icon: Mail },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquareText },
    { key: 'integracion', label: 'Integración', icon: PlugZap },
  ]

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
  }

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Configuración de Comunicación</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Correo, WhatsApp y estado de integración</p>
        </div>
        <StatusBadge ok={tab === 'correo' ? smtpConfigured : tab === 'whatsapp' ? waConfigured : (smtpConfigured || waConfigured)} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition',
              tab === t.key ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <t.icon size={14} /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── CORREO ──────────────────────────────────────────────── */}
      {tab === 'correo' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Server size={15} className="text-brand" /> Envío de correo (SMTP)</h2>
              <StatusBadge ok={smtpConfigured} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Correo remitente (nombre)" value={form.email_from} onChange={e => set('email_from', e.target.value)} placeholder="Decoraciones Interiores" />
              <Field label="Usuario / correo SMTP" value={form.smtp_user} onChange={e => set('smtp_user', e.target.value)} placeholder="marketing@decorinteriores.pe" />
              <Field label="Servidor SMTP" value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
              <Field label="Puerto" value={form.smtp_port} onChange={e => set('smtp_port', e.target.value)} placeholder="587" />
              <Field label="Contraseña / App Password" type="password" value={form.smtp_pass} onChange={e => set('smtp_pass', e.target.value)}
                placeholder={secretsSet.smtp_pass ? '•••••••• (sin cambios)' : 'Contraseña SMTP'} />
              <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2.5 mt-5 sm:mt-0">
                <span className="text-sm text-gray-700">Conexión segura SSL/TLS</span>
                <Toggle checked={form.smtp_ssl === 'true'} onChange={v => set('smtp_ssl', String(v))} />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={testSmtp} disabled={testingSmtp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                {testingSmtp ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Probar conexión
              </button>
              {smtpResult && (
                <span className={cn('text-xs flex items-center gap-1', smtpResult.ok ? 'text-green-600' : 'text-red-500')}>
                  {smtpResult.ok ? <Check size={13} /> : <X size={13} />} {smtpResult.ok ? 'Conexión exitosa' : smtpResult.error}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><KeyRound size={15} className="text-brand" /> Recepción de correos (IMAP)</h2>
              <StatusBadge ok={imapConfigured} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Servidor IMAP" value={form.imap_host} onChange={e => set('imap_host', e.target.value)} placeholder="imap.gmail.com" />
              <Field label="Puerto IMAP" value={form.imap_port} onChange={e => set('imap_port', e.target.value)} placeholder="993" />
              <Field label="Usuario IMAP" value={form.imap_user} onChange={e => set('imap_user', e.target.value)} placeholder="marketing@decorinteriores.pe" />
              <Field label="Contraseña IMAP" type="password" value={form.imap_pass} onChange={e => set('imap_pass', e.target.value)}
                placeholder={secretsSet.imap_pass ? '•••••••• (sin cambios)' : 'Contraseña IMAP'} />
            </div>
            <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2.5">
              <span className="text-sm text-gray-700">IMAP seguro (SSL/TLS)</span>
              <Toggle checked={form.imap_ssl === 'true'} onChange={v => set('imap_ssl', String(v))} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={testImap} disabled={testingImap}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                {testingImap ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Probar conexión
              </button>
              {imapResult && (
                <span className={cn('text-xs flex items-center gap-1', imapResult.ok ? 'text-green-600' : 'text-red-500')}>
                  {imapResult.ok ? <Check size={13} /> : <X size={13} />} {imapResult.ok ? 'Conexión exitosa' : imapResult.error}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><TypeIcon size={15} className="text-brand" /> Firma de correo</h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'profesional', label: 'Profesional', icon: ShieldCheck },
                { key: 'simple', label: 'Simple', icon: TypeIcon },
                { key: 'eslogan', label: 'Con eslogan', icon: Sparkles },
                { key: 'tarjeta', label: 'Tarjeta con foto', icon: IdCard },
                { key: 'vaciar', label: 'Vaciar', icon: Eraser },
              ].map(p => (
                <button key={p.key} onClick={() => applyPreset(p.key)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                  <p.icon size={11} /> {p.label}
                </button>
              ))}
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-100 bg-gray-50/50">
                <button onClick={() => exec('bold')} className="p-1 rounded hover:bg-gray-200 text-gray-500 transition"><Bold size={13} /></button>
                <button onClick={() => exec('italic')} className="p-1 rounded hover:bg-gray-200 text-gray-500 transition"><Italic size={13} /></button>
                <button onClick={() => exec('underline')} className="p-1 rounded hover:bg-gray-200 text-gray-500 transition"><Underline size={13} /></button>
                <div className="w-px h-4 bg-gray-200 mx-0.5" />
                <button onClick={insertLink} className="p-1 rounded hover:bg-gray-200 text-gray-500 transition"><Link2 size={13} /></button>
              </div>
              <div ref={sigRef} contentEditable suppressContentEditableWarning
                className="w-full min-h-[110px] px-4 py-3 text-sm focus:outline-none" />
            </div>
            <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2.5">
              <span className="text-sm text-gray-700">Activar envío de correos</span>
              <Toggle checked={form.email_enabled === 'true'} onChange={v => set('email_enabled', String(v))} />
            </div>
          </div>
        </div>
      )}

      {/* ── WHATSAPP ────────────────────────────────────────────── */}
      {tab === 'whatsapp' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><MessageSquareText size={15} className="text-brand" /> WhatsApp Cloud API (Meta)</h2>
            <StatusBadge ok={waConfigured} />
          </div>
          {waStatus?.connected && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-green-50 text-green-700">
              <ShieldCheck size={14} /> Ya conectado vía variables de entorno de Vercel — el envío en <span className="font-mono">/whatsapp</span> está activo.
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Proveedor / método</label>
            <select value={form.wa_provider} onChange={e => set('wa_provider', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20">
              <option value="cloud_api">WhatsApp Cloud API (Meta)</option>
              <option value="baileys">Baileys (servidor propio, QR)</option>
            </select>
          </div>
          {form.wa_provider === 'cloud_api' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone Number ID" value={form.wa_phone_id} onChange={e => set('wa_phone_id', e.target.value)} placeholder="1029384756" />
              <Field label="Número de WhatsApp" value={form.wa_number} onChange={e => set('wa_number', e.target.value)} placeholder="+51 999 999 999" />
              <Field label="Access Token" type="password" value={form.wa_token} onChange={e => set('wa_token', e.target.value)}
                placeholder={secretsSet.wa_token ? '•••••••• (sin cambios)' : 'Token permanente de Meta'} />
            </div>
          ) : (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">Baileys usa un servidor propio con QR — configúralo en <span className="font-mono">BAILEYS_URL</span>. La prueba de conexión llama a su endpoint <span className="font-mono">/health</span>.</p>
          )}
          <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2.5">
            <span className="text-sm text-gray-700">Activar envío de WhatsApp</span>
            <Toggle checked={form.wa_enabled === 'true'} onChange={v => set('wa_enabled', String(v))} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={testWhatsapp} disabled={testingWa}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
              {testingWa ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Probar conexión
            </button>
            {waResult && (
              <span className={cn('text-xs flex items-center gap-1', waResult.ok ? 'text-green-600' : 'text-red-500')}>
                {waResult.ok ? <Check size={13} /> : <X size={13} />} {waResult.ok ? `Conexión exitosa${waResult.phone ? ` · ${waResult.phone}` : ''}` : waResult.error}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">El envío real de mensajes por Cloud API usa las variables de entorno de Vercel (<span className="font-mono">WHATSAPP_PHONE_NUMBER_ID</span>, <span className="font-mono">WHATSAPP_ACCESS_TOKEN</span>). Estos campos permiten verificar credenciales antes de colocarlas allí.</p>
        </div>
      )}

      {/* ── INTEGRACIÓN ─────────────────────────────────────────── */}
      {tab === 'integracion' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Estado de conexión</h2>
            {[
              { label: 'Correo (SMTP/IMAP)', ok: smtpConfigured, onTest: testSmtp },
              { label: 'WhatsApp', ok: waConfigured, onTest: testWhatsapp },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-2.5">
                <span className="text-sm text-gray-700">{row.label}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge ok={row.ok} />
                  <button onClick={row.onTest} className="text-xs text-brand hover:underline">Probar</button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><KeyRound size={15} className="text-brand" /> Claves y tokens</h2>
            {[
              { label: 'SMTP · Contraseña', ok: secretsSet.smtp_pass },
              { label: 'IMAP · Contraseña', ok: secretsSet.imap_pass },
              { label: 'WhatsApp · Access Token', ok: Boolean(secretsSet.wa_token || waStatus?.connected) },
              { label: 'WhatsApp · Webhook Verify Token', ok: Boolean(waStatus?.webhook_verify_token_set) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-sm px-1 py-1.5">
                <span className="text-gray-600">{row.label}</span>
                <span className={cn('text-xs font-semibold', row.ok ? 'text-green-600' : 'text-gray-400')}>{row.ok ? 'Configurado' : 'No configurado'}</span>
              </div>
            ))}
            <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">Las contraseñas y tokens se guardan en el servidor y nunca se envían de vuelta al navegador — solo se confirma si están configurados.</p>
          </div>
        </div>
      )}

      <button onClick={save} disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-brand text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60">
        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
        {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar configuración'}
      </button>
    </div>
  )
}
