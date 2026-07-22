'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Inbox, Star, Send, FileText, AlertCircle, Trash2, Search, Plus, Reply, Forward,
  ArrowLeft, Loader2, X, Mail, Tag, RefreshCw, MoreHorizontal, Flame, Printer,
  CheckCheck, SlidersHorizontal, Archive, Check, Paperclip, Download, Users, Save,
  ChevronDown, Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RichEditor } from '@/components/comm/rich-editor'
import { alertDialog, confirmDialog, promptDialog } from '@/lib/dialogs'

const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

interface Att { name: string; url: string; type?: string }
interface Msg {
  id: string; folder: string; direccion: string
  de_nombre: string | null; de_email: string | null; para: string | null; to_nombre: string | null
  asunto: string | null; cuerpo: string | null; cuerpo_html: string | null
  label: string | null; estrella: boolean; leido: boolean; created_at: string
  attachments?: Att[]
}
interface Lbl { id: string; label: string; color: string }

const FOLDERS = [
  { id: 'bandeja', label: 'Bandeja de entrada', icon: Inbox },
  { id: 'destacados', label: 'Destacados', icon: Star },
  { id: 'enviados', label: 'Enviados', icon: Send },
  { id: 'archivo', label: 'Archivo', icon: Archive },
  { id: 'borradores', label: 'Borradores', icon: FileText },
  { id: 'spam', label: 'Spam', icon: AlertCircle },
  { id: 'papelera', label: 'Papelera', icon: Trash2 },
]
const DEFAULT_LABELS: Lbl[] = [
  { id: 'empresa', label: 'EMPRESA', color: '#ef4444' },
  { id: 'administracion', label: 'ADMINISTRACIÓN', color: '#22c55e' },
  { id: 'contabilidad', label: 'CONTABILIDAD', color: '#3b82f6' },
  { id: 'rrhh', label: 'RR.HH', color: '#ec4899' },
]
const LBL_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#7c3aed', '#db2777', '#ea580c', '#eab308', '#14b8a6', '#94a3b8', '#0f172a']
const initials = (s: string) => (s || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
const fmtTime = (iso: string) => {
  try {
    const d = new Date(iso); const now = new Date()
    if (d.toDateString() === now.toDateString()) return 'Hoy'
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  } catch { return '' }
}
const isImg = (a: Att) => (a.type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(a.name)

// Renderiza el HTML del correo en un iframe aislado (tipo Gmail): scripts bloqueados, imágenes y formato sí.
function EmailFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [h, setH] = useState(240)
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{margin:0;padding:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#111;word-wrap:break-word;overflow-x:hidden}img{max-width:100%;height:auto}table{max-width:100%}a{color:#0d9488}</style></head><body>${html}</body></html>`
  function onLoad() {
    try { const d = ref.current?.contentDocument; if (d) setH(Math.min(6000, d.body.scrollHeight + 24)) } catch {}
  }
  return <iframe ref={ref} title="correo" srcDoc={srcDoc} onLoad={onLoad}
    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    style={{ width: '100%', height: h, border: 0 }} />
}

function ToolBtn({ onClick, icon, label, danger }: { onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label}
      className={cn('flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-gray-100 transition', danger ? 'text-gray-500 hover:text-red-500' : 'text-gray-600')}>
      {icon}<span className="text-[10px] font-medium hidden sm:block">{label}</span>
    </button>
  )
}
function MoreItem({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">{icon} {label}</button>
}

export default function BandejaPage() {
  const [folder, setFolder] = useState('bandeja')
  const [label, setLabel] = useState('')
  const [q, setQ] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Msg | null>(null)
  const [compose, setCompose] = useState<{ to: string; subject: string; body: string } | null>(null)
  const [composeId, setComposeId] = useState<string | null>(null)
  const [composeAtts, setComposeAtts] = useState<Att[]>([])
  const [mobileDetail, setMobileDetail] = useState(false)
  const [sending, setSending] = useState(false)
  const [signature, setSignature] = useState('')
  const [account, setAccount] = useState('')
  const [contactos, setContactos] = useState<{ nombre: string; email: string }[]>([])
  const [labels, setLabels] = useState<Lbl[]>(DEFAULT_LABELS)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showMark, setShowMark] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadingAtt, setUploadingAtt] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [density, setDensity] = useState<'normal' | 'compacto'>('normal')
  const [fontScale, setFontScale] = useState(1)
  const [lightbox, setLightbox] = useState<Att | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams(); p.set('folder', folder); if (label) p.set('label', label); if (q) p.set('q', q)
    fetch('/api/comunicacion/mensajes?' + p.toString()).then(r => r.json())
      .then(d => { setMsgs(Array.isArray(d?.mensajes) ? d.mensajes : []); setLoading(false) }).catch(() => setLoading(false))
  }, [folder, label, q])
  useEffect(() => { load() }, [load])

  const loadCounts = useCallback(() => { fetch('/api/comunicacion/mensajes?counts=1').then(r => r.json()).then(d => setCounts(d || {})).catch(() => {}) }, [])
  useEffect(() => { loadCounts() }, [msgs, loadCounts])

  const loadContactos = useCallback(() => {
    fetch('/api/comunicacion/contactos').then(r => r.json()).then(d => setContactos(Array.isArray(d) ? d.filter((c: { email: string }) => c.email) : [])).catch(() => {})
  }, [])

  useEffect(() => {
    loadContactos()
    fetch('/api/comunicacion/settings').then(r => r.json()).then(s => {
      setAccount(s?.smtp_user || s?.imap_user || '')
      if (s?.signature_html) setSignature(s.signature_html)
    }).catch(() => {})
    fetch('/api/settings').then(r => r.json()).then((s) => {
      const get = (k: string) => Array.isArray(s) ? s.find((x: { key: string }) => x.key === k)?.value : ''
      try { const lb = JSON.parse(get('comm_labels') || '[]'); if (Array.isArray(lb) && lb.length) setLabels(lb) } catch {}
    }).catch(() => {})
    try { const dn = localStorage.getItem('inbox_density'); if (dn === 'compacto') setDensity('compacto'); const f = localStorage.getItem('inbox_font'); if (f) setFontScale(Number(f)) } catch {}
  }, [loadContactos])
  useEffect(() => { try { localStorage.setItem('inbox_density', density); localStorage.setItem('inbox_font', String(fontScale)) } catch {} }, [density, fontScale])

  // Auto-sync silencioso al abrir + cada 3 min
  useEffect(() => {
    fetch('/api/comunicacion/sync', { method: 'POST' }).then(r => r.ok ? r.json() : null).then(j => { if (j?.nuevos > 0) load() }).catch(() => {})
    const t = setInterval(() => {
      fetch('/api/comunicacion/sync', { method: 'POST' }).then(r => r.ok ? r.json() : null).then(j => { if (j?.nuevos > 0) load() }).catch(() => {})
    }, 180000)
    return () => clearInterval(t)
  }, [load])

  // Autoguardado de borrador cada 20s
  useEffect(() => {
    if (!compose) return
    const t = setInterval(() => { if (compose.to || compose.subject || (compose.body && compose.body.length > 10)) saveDraft(true) }, 20000)
    return () => clearInterval(t)
  }, [compose, composeId, composeAtts]) // eslint-disable-line

  async function saveLabels(next: Lbl[]) {
    setLabels(next)
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'comm_labels', value: JSON.stringify(next) }) })
  }
  async function addLabel() {
    const name = await promptDialog('Nombre de la nueva etiqueta:', '', { placeholder: 'Ej: Clientes VIP' })
    if (name?.trim()) saveLabels([...labels, { id: 'l' + Date.now().toString(36), label: name.trim().toUpperCase(), color: LBL_COLORS[labels.length % LBL_COLORS.length] }])
  }
  const labelOf = (id: string | null) => labels.find(l => l.id === id)

  async function sync() {
    setSyncing(true)
    try {
      const r = await fetch('/api/comunicacion/sync', { method: 'POST' })
      const j = await r.json()
      if (!r.ok || j.error) await alertDialog(j.error || 'No se pudo sincronizar', { title: 'Sincronización' })
      else if (j.nuevos === 0) await alertDialog('Bandeja al día. Sin correos nuevos.', { title: 'Sincronización' })
    } catch { await alertDialog('Error de sincronización.') }
    setSyncing(false); load()
  }

  async function patch(id: string, fields: Partial<Msg>) {
    await fetch('/api/comunicacion/mensajes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...fields }) })
  }
  async function open(m: Msg) {
    if (m.folder === 'borradores') { setComposeId(m.id); setComposeAtts(m.attachments ?? []); setCompose({ to: m.para || '', subject: m.asunto || '', body: m.cuerpo_html || '' }); setSel(null); setMobileDetail(true); return }
    setSel(m); setCompose(null); setMobileDetail(true); setShowMore(false); setShowMark(false)
    if (!m.leido) { setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, leido: true } : x)); patch(m.id, { leido: true }) }
  }
  async function toggleStar(m: Msg, e: React.MouseEvent) {
    e.stopPropagation(); const v = !m.estrella
    setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, estrella: v } : x))
    if (sel?.id === m.id) setSel(s => s ? { ...s, estrella: v } : s)
    patch(m.id, { estrella: v })
  }
  async function del(m: Msg) {
    await fetch(`/api/comunicacion/mensajes?id=${m.id}${folder === 'papelera' ? '&hard=1' : ''}`, { method: 'DELETE' })
    setSel(null); setMobileDetail(false); load()
  }
  async function moveTo(m: Msg, dest: string) {
    setShowMore(false); setSel(null); setMobileDetail(false)
    await patch(m.id, { folder: dest }); load()
  }
  async function setMsgLabel(m: Msg, lb: string) {
    setShowMark(false)
    setSel(s => s && s.id === m.id ? { ...s, label: lb } : s)
    setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, label: lb } : x))
    patch(m.id, { label: lb })
  }
  async function markAllRead() {
    const ids = msgs.filter(m => !m.leido).map(m => m.id)
    setMsgs(prev => prev.map(m => ({ ...m, leido: true })))
    await Promise.all(ids.map(id => patch(id, { leido: true })))
  }
  async function guardarContacto(m: Msg) {
    setShowMore(false)
    if (!m.de_email) { await alertDialog('Este mensaje no tiene correo de remitente.'); return }
    const r = await fetch('/api/comunicacion/contactos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: m.de_nombre, email: m.de_email }) })
    if (r.ok) { await alertDialog('Contacto guardado en la libreta.'); loadContactos() }
    else await alertDialog('No se pudo guardar el contacto.')
  }
  function printMsg(m: Msg) {
    setShowMore(false)
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(`<html><head><title>${m.asunto || ''}</title></head><body style="font-family:Arial;padding:24px"><h2>${m.asunto || ''}</h2><p style="color:#666">${m.de_nombre || ''} · ${new Date(m.created_at).toLocaleString('es-PE')}</p><hr>${m.cuerpo_html || '<pre style="white-space:pre-wrap;font-family:Arial">' + (m.cuerpo || '') + '</pre>'}</body></html>`)
    w.document.close(); w.print()
  }

  function startNew() { setComposeId(null); setComposeAtts([]); setCompose({ to: '', subject: '', body: '' }); setSel(null); setMobileDetail(true) }
  function startReply(m: Msg) { setComposeId(null); setComposeAtts([]); setCompose({ to: m.de_email || '', subject: `Re: ${m.asunto || ''}`, body: `<br><br><br>--- En respuesta a ${m.de_nombre || m.de_email} ---<br>${m.cuerpo_html || m.cuerpo || ''}` }); setSel(null); setMobileDetail(true) }
  function startForward(m: Msg) { setComposeId(null); setComposeAtts(m.attachments ?? []); setCompose({ to: '', subject: `Fwd: ${m.asunto || ''}`, body: `<br><br>--- Mensaje reenviado ---<br>${m.cuerpo_html || m.cuerpo || ''}` }); setSel(null); setMobileDetail(true) }

  async function uploadFiles(files: FileList | File[]) {
    setUploadingAtt(true)
    for (const f of Array.from(files)) {
      try { const fd = new FormData(); fd.append('file', f); const r = await fetch('/api/comunicacion/upload', { method: 'POST', body: fd }); if (r.ok) { const j = await r.json(); setComposeAtts(prev => [...prev, { name: j.name, url: j.url, type: j.type }]) } } catch {}
    }
    setUploadingAtt(false)
  }

  async function saveDraft(silent = false) {
    if (!compose) return
    const payload = { id: composeId ?? undefined, folder: 'borradores', direccion: 'saliente', para: compose.to, to_nombre: compose.to, asunto: compose.subject, cuerpo: stripHtml(compose.body).slice(0, 400), cuerpo_html: compose.body, leido: true, attachments: composeAtts }
    const r = await fetch('/api/comunicacion/mensajes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (r.ok) { const j = await r.json(); if (j?.id) setComposeId(j.id) }
    if (!silent) { await alertDialog('Borrador guardado.'); setCompose(null); setComposeId(null); setComposeAtts([]); setMobileDetail(false); load() }
  }

  async function send() {
    if (!compose) return
    if (!compose.to.includes('@')) { await alertDialog('Ingresa un destinatario válido.'); return }
    setSending(true)
    try {
      const r = await fetch('/api/comunicacion/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: compose.to, subject: compose.subject, html: compose.body, attachments: composeAtts }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { await alertDialog(j.error || 'No se pudo enviar el correo.'); setSending(false); return }
      if (composeId) await fetch(`/api/comunicacion/mensajes?id=${composeId}&hard=1`, { method: 'DELETE' })
      setCompose(null); setComposeId(null); setComposeAtts([]); setMobileDetail(false)
      setSending(false); load()
      await alertDialog('Correo enviado.', { title: 'Enviado' })
    } catch { setSending(false); await alertDialog('Error al enviar.') }
  }

  // Selección múltiple
  const toggleSel = (id: string, e?: React.MouseEvent) => { e?.stopPropagation(); setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  async function bulk(action: 'delete' | 'archive' | 'read') {
    const ids = [...selected]
    await Promise.all(ids.map(id => action === 'delete'
      ? fetch(`/api/comunicacion/mensajes?id=${id}${folder === 'papelera' ? '&hard=1' : ''}`, { method: 'DELETE' })
      : patch(id, action === 'archive' ? { folder: 'archivo' } : { leido: true })))
    setSelected(new Set()); load()
  }

  const unread = counts.bandeja !== undefined ? msgs.filter(m => m.folder === 'bandeja' && !m.leido).length : 0
  const shown = onlyUnread ? msgs.filter(m => !m.leido) : msgs
  const totalCorreos = FOLDERS.reduce((a, f) => a + (f.id === 'destacados' ? 0 : (counts[f.id] || 0)), 0)

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col" style={{ fontSize: `${fontScale}rem` }}>
      {/* Encabezado */}
      <div className="px-3 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2"><Inbox size={18} className="text-brand" /><h1 className="font-bold text-gray-900 text-base">Bandeja de entrada</h1></div>
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar correos…" className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
        </div>
        {account && <span className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5"><Mail size={13} className="text-brand" /> {account}</span>}
        <button onClick={startNew} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:opacity-90 active:scale-95 transition">
          <Plus size={16} /> <span className="hidden sm:inline">Nuevo mensaje</span>
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Carpetas / etiquetas */}
        <aside className="hidden md:flex flex-col border-r border-gray-100 w-52 shrink-0">
          <div className="flex-1 overflow-y-auto p-2">
            {FOLDERS.map(f => (
              <button key={f.id} onClick={() => { setFolder(f.id); setLabel(''); setSel(null); setCompose(null) }}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium', folder === f.id && !label ? 'bg-brand/10 text-brand' : 'text-gray-600 hover:bg-gray-50')}>
                <f.icon size={16} className="shrink-0" />
                <span className="flex-1 text-left truncate">{f.label}</span>
                {f.id === 'bandeja' && unread > 0
                  ? <span className="text-[10px] bg-brand text-white rounded-full px-1.5 py-0.5 font-bold">{unread}</span>
                  : counts[f.id] ? <span className="text-[11px] text-gray-400 font-medium">{counts[f.id]}</span> : null}
              </button>
            ))}
            <div className="flex items-center justify-between mt-3 mb-1 px-3">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Etiquetas</p>
              <button onClick={addLabel} title="Nueva etiqueta" className="text-gray-400 hover:text-brand"><Plus size={14} /></button>
            </div>
            {labels.map(l => (
              <button key={l.id} onClick={() => { setLabel(label === l.id ? '' : l.id); setFolder('bandeja'); setSel(null) }}
                className={cn('w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm', label === l.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50')}>
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: l.color }} /> <span className="truncate text-[13px]">{l.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-2 space-y-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Letra</span>
              <div className="flex gap-1">
                {[0.85, 1, 1.15].map((s, i) => <button key={s} onClick={() => setFontScale(s)} className={cn('w-6 h-6 rounded font-bold', fontScale === s ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500', i === 0 ? 'text-[10px]' : i === 1 ? 'text-xs' : 'text-sm')}>A</button>)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Filas</span>
              <button onClick={() => setDensity(d => d === 'normal' ? 'compacto' : 'normal')} className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded px-2 py-1 hover:bg-gray-200">{density === 'normal' ? 'Normal' : 'Compacto'}</button>
            </div>
            <p className="text-[10px] text-gray-400 text-center pt-1 border-t border-gray-50">📥 {totalCorreos} correos · {Math.min(100, Math.round(totalCorreos / 500 * 100))}% de 500</p>
          </div>
        </aside>

        {/* Lista */}
        <section className={cn('flex flex-col w-full md:w-[360px] border-r border-gray-100 min-h-0 md:shrink-0', mobileDetail && 'hidden md:flex')}>
          {selected.size > 0 ? (
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-brand/5">
              <span className="text-xs text-gray-500 font-medium px-1">{selected.size} sel.</span>
              <span className="flex-1" />
              <button onClick={() => bulk('read')} title="Marcar leído" className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><CheckCheck size={15} /></button>
              <button onClick={() => bulk('archive')} title="Archivar" className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Archive size={15} /></button>
              <button onClick={() => bulk('delete')} title="Eliminar" className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
              <button onClick={() => setSelected(new Set())} title="Cancelar" className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><X size={15} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100">
              <button onClick={sync} disabled={syncing} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-brand bg-brand/10 hover:bg-brand/20 font-medium">{syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sincronizar</button>
              <button onClick={() => setOnlyUnread(v => !v)} className={cn('flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs hover:bg-gray-100', onlyUnread ? 'text-brand bg-brand/10' : 'text-gray-600')}><SlidersHorizontal size={14} /> {onlyUnread ? 'No leídos' : 'Todos'}</button>
              <button onClick={markAllRead} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100"><CheckCheck size={14} /> Leer todo</button>
            </div>
          )}
          {/* selector móvil */}
          <div className="md:hidden p-2 border-b border-gray-100 flex gap-2">
            <select value={folder} onChange={e => { setFolder(e.target.value); setLabel('') }} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              {FOLDERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
            : shown.length === 0 ? <p className="text-center text-gray-400 text-sm py-12">Sin mensajes en esta carpeta.</p>
            : shown.map(m => {
              const lb = labelOf(m.label)
              const who = m.direccion === 'saliente' ? (m.to_nombre || m.para) : (m.de_nombre || m.de_email)
              return (
                <div key={m.id} onClick={() => open(m)}
                  className={cn('w-full flex gap-2.5 px-3 border-b border-gray-50 text-left hover:bg-gray-50 transition cursor-pointer items-start', density === 'compacto' ? 'py-1.5' : 'py-3', sel?.id === m.id && 'bg-brand/5', selected.has(m.id) && 'bg-brand/10', !m.leido && 'bg-brand/5')}>
                  <input type="checkbox" checked={selected.has(m.id)} onClick={e => toggleSel(m.id, e as unknown as React.MouseEvent)} onChange={() => {}} className="mt-1 accent-brand shrink-0 cursor-pointer" />
                  <span className="w-9 h-9 rounded-full bg-brand/15 text-brand text-xs font-bold flex items-center justify-center shrink-0">{initials(who || '?')}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('text-sm truncate', m.leido ? 'text-gray-600' : 'font-bold text-gray-900')}>{who}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{fmtTime(m.created_at)}</span>
                    </div>
                    <p className={cn('text-[13px] truncate', m.leido ? 'text-gray-500' : 'font-semibold text-gray-800')}>{m.asunto || '(sin asunto)'}</p>
                    {density !== 'compacto' && <p className="text-xs text-gray-400 truncate">{m.cuerpo}</p>}
                    {lb && density !== 'compacto' && <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium" style={{ color: lb.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lb.color }} />{lb.label}</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.attachments && m.attachments.length > 0 && <Paperclip size={12} className="text-gray-300" />}
                    <button onClick={e => toggleStar(m, e)} className={cn(m.estrella ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400')}><Star size={15} fill={m.estrella ? 'currentColor' : 'none'} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Detalle / Redacción */}
        <section className={cn('flex-1 flex flex-col min-w-0 min-h-0 bg-white', !mobileDetail && 'hidden md:flex')}>
          {compose ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
                <button onClick={() => { setCompose(null); setMobileDetail(false) }} className="md:hidden text-gray-400"><ArrowLeft size={18} /></button>
                <Mail size={16} className="text-brand" /><h2 className="font-semibold text-gray-800 text-sm">Redactar mensaje</h2>
                <button onClick={() => { setCompose(null); setComposeId(null); setMobileDetail(false) }} className="ml-auto text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col min-h-0">
                <input value={compose.to} onChange={e => setCompose({ ...compose, to: e.target.value })} placeholder="Para: correo@destino.com" list="comm-contactos" className="w-full border-b border-gray-100 px-1 py-2 text-sm focus:outline-none" />
                <datalist id="comm-contactos">{contactos.map((c, i) => <option key={i} value={c.email}>{c.nombre}</option>)}</datalist>
                <input value={compose.subject} onChange={e => setCompose({ ...compose, subject: e.target.value })} placeholder="Asunto" className="w-full border-b border-gray-100 px-1 py-2 text-sm focus:outline-none" />
                <div className="flex-1 min-h-0">
                  <RichEditor value={compose.body} onChange={html => setCompose(c => c ? { ...c, body: html } : c)} signature={signature} />
                </div>
                <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files) }}
                  className={cn('rounded-xl border-2 border-dashed p-2.5 transition shrink-0', dragOver ? 'border-brand bg-brand/5' : 'border-gray-200')}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{uploadingAtt ? 'Subiendo…' : 'Arrastra archivos aquí o'}</p>
                    <label className="text-xs font-medium text-brand cursor-pointer hover:underline">Adjuntar archivos<input type="file" multiple className="hidden" onChange={e => e.target.files && uploadFiles(e.target.files)} /></label>
                  </div>
                  {composeAtts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {composeAtts.map((a, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {isImg(a) ? <img src={a.url} alt={a.name} className="w-full h-full object-cover" /> : <div className="text-center px-1"><Paperclip size={16} className="mx-auto text-gray-400" /><p className="text-[9px] text-gray-500 truncate w-16 mt-1">{a.name}</p></div>}
                          <button onClick={() => setComposeAtts(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
                <button onClick={send} disabled={sending} className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">{sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar</button>
                <button onClick={() => saveDraft(false)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"><Save size={14} /> Borrador</button>
                <span className="text-[11px] text-gray-400 hidden sm:block">Se guarda solo cada 20s</span>
                <button onClick={() => { setCompose(null); setComposeId(null); setMobileDetail(false) }} className="text-gray-400 hover:text-red-500 ml-auto"><Trash2 size={16} /></button>
              </div>
            </div>
          ) : sel ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 flex-wrap shrink-0">
                <button onClick={() => setMobileDetail(false)} className="md:hidden text-gray-400 mr-1"><ArrowLeft size={18} /></button>
                <ToolBtn onClick={() => startReply(sel)} icon={<Reply size={15} />} label="Responder" />
                <ToolBtn onClick={() => startForward(sel)} icon={<Forward size={15} />} label="Reenviar" />
                <span className="w-px h-5 bg-gray-200 mx-1" />
                <ToolBtn onClick={() => del(sel)} icon={<Trash2 size={15} />} label="Eliminar" danger />
                <ToolBtn onClick={() => moveTo(sel, 'archivo')} icon={<Archive size={15} />} label="Archivar" />
                <ToolBtn onClick={() => moveTo(sel, 'spam')} icon={<Flame size={15} />} label="SPAM" />
                <div className="relative">
                  <ToolBtn onClick={() => { setShowMark(v => !v); setShowMore(false) }} icon={<Tag size={15} />} label="Marcar" />
                  {showMark && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMark(false)} />
                      <div className="absolute top-12 left-0 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-52">
                        {labels.map(l => (
                          <button key={l.id} onClick={() => setMsgLabel(sel, l.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} /> {l.label}{sel.label === l.id && <Check size={13} className="ml-auto text-brand" />}</button>
                        ))}
                        <button onClick={() => setMsgLabel(sel, '')} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"><X size={13} /> Sin etiqueta</button>
                      </div>
                    </>
                  )}
                </div>
                <div className="relative ml-auto">
                  <ToolBtn onClick={() => { setShowMore(v => !v); setShowMark(false) }} icon={<MoreHorizontal size={15} />} label="Más" />
                  {showMore && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMore(false)} />
                      <div className="absolute top-12 right-0 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-56">
                        <MoreItem onClick={() => guardarContacto(sel)} icon={<Users size={14} />} label="Guardar remitente en contactos" />
                        <MoreItem onClick={() => printMsg(sel)} icon={<Printer size={14} />} label="Imprimir este mensaje" />
                        <div className="border-t border-gray-50 my-1" />
                        <MoreItem onClick={() => moveTo(sel, 'bandeja')} icon={<Inbox size={14} />} label="Mover a Bandeja" />
                        <MoreItem onClick={() => moveTo(sel, 'archivo')} icon={<Archive size={14} />} label="Mover a Archivo" />
                        <MoreItem onClick={() => moveTo(sel, 'papelera')} icon={<Trash2 size={14} />} label="Mover a Papelera" />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{sel.asunto || '(sin asunto)'}</h2>
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                  <span className="w-10 h-10 rounded-full bg-brand/15 text-brand text-sm font-bold flex items-center justify-center shrink-0">{initials((sel.direccion === 'saliente' ? sel.to_nombre || sel.para : sel.de_nombre || sel.de_email) || '?')}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{sel.direccion === 'saliente' ? (sel.to_nombre || sel.para) : (sel.de_nombre || sel.de_email)}</p>
                    <p className="text-xs text-gray-400 truncate">{sel.direccion === 'saliente' ? `Para: ${sel.para}` : sel.de_email}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{new Date(sel.created_at).toLocaleString('es-PE')}</span>
                </div>
                {sel.cuerpo_html
                  ? <EmailFrame html={sel.cuerpo_html} />
                  : <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{sel.cuerpo}</p>}

                {sel.attachments && sel.attachments.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5"><Paperclip size={13} /> {sel.attachments.length} adjunto(s)</p>
                    <div className="flex flex-wrap gap-3">
                      {sel.attachments.map((a, i) => (
                        <div key={i} className="w-28 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
                          <button onClick={() => isImg(a) ? setLightbox(a) : window.open(a.url, '_blank')} className="w-full text-left">
                            <div className="h-24 bg-gray-50 flex items-center justify-center overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {isImg(a) ? <img src={a.url} alt={a.name} className="w-full h-full object-cover" /> : <Paperclip size={24} className="text-gray-300" />}
                            </div>
                            <div className="px-2 py-1.5 flex items-center gap-1"><Maximize2 size={11} className="text-gray-400 shrink-0" /><span className="text-[11px] text-gray-600 truncate">{a.name}</span></div>
                          </button>
                          <a href={a.url} download target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 py-1 border-t border-gray-100 text-[10px] text-gray-500 hover:text-brand hover:bg-gray-50"><Download size={10} /> Descargar</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 hidden md:flex flex-col items-center justify-center text-gray-300">
              <Mail size={40} className="mb-3" /><p className="text-sm">Selecciona un mensaje para leerlo</p>
            </div>
          )}
        </section>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightbox(null)}><X size={26} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.url} alt={lightbox.name} className="max-w-full max-h-[85vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          <a href={lightbox.url} download target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 bg-white text-gray-800 rounded-xl text-sm font-medium hover:bg-gray-100"><Download size={14} /> Descargar {lightbox.name}</a>
        </div>
      )}
    </div>
  )
}
