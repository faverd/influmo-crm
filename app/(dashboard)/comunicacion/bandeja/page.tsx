'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, RefreshCw, Star, Trash2, Archive, Plus,
  Inbox, Send, File, AlertCircle,
  CheckSquare, Square, Mail, MailOpen, PenSquare, X,
  Bold, Italic, Underline, Link2, ImageIcon, Paperclip, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { alertDialog } from '@/lib/dialogs'

const CORREO_CUENTA = 'marketing@decorinteriores.pe'

type Msg = {
  id: string; canal: string; direccion: string
  de_nombre: string | null; de_email: string | null; para: string | null
  asunto: string | null; cuerpo: string | null
  leido: boolean; estrella: boolean; folder: string; created_at: string
}

const ETIQUETAS = [
  { key: 'empresa',       label: 'EMPRESA',        color: '#ef4444' },
  { key: 'administracion',label: 'ADMINISTRACIÓN', color: '#22c55e' },
  { key: 'contabilidad',  label: 'CONTABILIDAD',   color: '#3b82f6' },
  { key: 'rrhh',          label: 'RR.HH',          color: '#ef4444' },
]

function fmtFecha(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86400000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays > 1 && diffDays < 7) return `${diffDays} días`
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

type FontSize = 'A-sm' | 'A-md' | 'A-lg'

export default function BandejaPage() {
  const [mensajes, setMensajes] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [folder, setFolder]     = useState('bandeja')
  const [selected, setSelected] = useState<Msg | null>(null)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<'todos' | 'no_leidos' | 'destacados'>('todos')
  const [checked, setChecked]   = useState<Set<string>>(new Set())
  const [fontSize, setFontSize] = useState<FontSize>('A-md')
  const [compact, setCompact]   = useState(false)
  const [composing, setComposing] = useState(false)
  const [sendingCompose, setSendingCompose] = useState(false)
  const [reply, setReply]       = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [newMsg, setNewMsg]     = useState({ to: '', subject: '', body: '' })

  const fontClass = fontSize === 'A-sm' ? 'text-[11px]' : fontSize === 'A-lg' ? 'text-sm' : 'text-xs'

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/comunicacion/mensajes?limit=200')
    if (r.ok) {
      const d = await r.json()
      setMensajes(d.mensajes ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function patch(id: string, body: Partial<Pick<Msg, 'leido' | 'estrella' | 'folder'>>) {
    setMensajes(m => m.map(x => x.id === id ? { ...x, ...body } : x))
    if (selected?.id === id) setSelected(s => s ? { ...s, ...body } : s)
    await fetch(`/api/comunicacion/mensajes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }

  function toggleLeido(id: string) {
    const m = mensajes.find(x => x.id === id)
    if (m) patch(id, { leido: !m.leido })
  }
  function toggleEstrella(id: string) {
    const m = mensajes.find(x => x.id === id)
    if (m) patch(id, { estrella: !m.estrella })
  }
  function eliminar(id: string) {
    patch(id, { folder: 'papelera' })
    if (selected?.id === id) setSelected(null)
  }
  function archivar(id: string) {
    patch(id, { folder: 'archivo' })
    if (selected?.id === id) setSelected(null)
  }
  function abrir(msg: Msg) {
    setSelected(msg); setReply('')
    if (!msg.leido) patch(msg.id, { leido: true })
  }
  function toggleCheck(id: string) {
    setChecked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  async function marcarTodoLeido() {
    const ids = mensajes.filter(m => m.folder === folder && !m.leido).map(m => m.id)
    setMensajes(m => m.map(x => ids.includes(x.id) ? { ...x, leido: true } : x))
    await Promise.all(ids.map(id => fetch(`/api/comunicacion/mensajes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leido: true }) })))
  }

  async function enviarNuevo() {
    if (!newMsg.to.trim() || !newMsg.subject.trim()) { await alertDialog('Ingresa destinatario y asunto'); return }
    setSendingCompose(true)
    const r = await fetch('/api/comunicacion/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: newMsg.to.trim(), subject: newMsg.subject.trim(), body: newMsg.body }),
    })
    const d = await r.json().catch(() => ({}))
    setSendingCompose(false)
    if (r.ok) {
      setComposing(false); setNewMsg({ to: '', subject: '', body: '' }); load()
    } else {
      await alertDialog(d.error || 'No se pudo enviar el correo. Revisa Comunicación → Configuración.')
    }
  }

  async function enviarRespuesta() {
    if (!selected || !reply.trim()) return
    setSendingReply(true)
    const r = await fetch('/api/comunicacion/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: selected.de_email, subject: `Re: ${selected.asunto || ''}`, body: reply.trim() }),
    })
    const d = await r.json().catch(() => ({}))
    setSendingReply(false)
    if (r.ok) { setReply(''); load() }
    else await alertDialog(d.error || 'No se pudo enviar la respuesta. Revisa Comunicación → Configuración.')
  }

  const FOLDERS = [
    { key: 'bandeja',    label: 'Bandeja de entrada', icon: Inbox,        count: mensajes.filter(m => m.folder === 'bandeja').length },
    { key: 'destacados', label: 'Destacados',          icon: Star,         count: mensajes.filter(m => m.estrella).length },
    { key: 'enviados',   label: 'Enviados',            icon: Send,         count: mensajes.filter(m => m.folder === 'enviados').length },
    { key: 'archivo',    label: 'Archivo',             icon: Archive,      count: mensajes.filter(m => m.folder === 'archivo').length },
    { key: 'borradores', label: 'Borradores',          icon: File,         count: 0 },
    { key: 'spam',       label: 'Spam',                icon: AlertCircle,  count: 0 },
    { key: 'papelera',   label: 'Papelera',            icon: Trash2,       count: mensajes.filter(m => m.folder === 'papelera').length },
  ]

  const filtrados = mensajes.filter(m => {
    if (folder === 'destacados') { if (!m.estrella) return false }
    else if (m.folder !== folder) return false
    if (filter === 'no_leidos'  && m.leido)    return false
    if (filter === 'destacados' && !m.estrella) return false
    const q = search.toLowerCase()
    return !q || (m.de_nombre || '').toLowerCase().includes(q) || (m.asunto || '').toLowerCase().includes(q)
  })

  const noLeidos = mensajes.filter(m => m.folder === 'bandeja' && !m.leido).length

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden bg-gray-50">
      {/* ── Left sidebar ─────────────────────────────────────────── */}
      <div className="hidden md:flex w-52 shrink-0 bg-white border-r border-gray-100 flex-col">
        <div className="p-3">
          <button onClick={() => setComposing(true)}
            className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-2.5 text-xs font-semibold hover:opacity-90 transition">
            <PenSquare size={14} /> + Nuevo mensaje
          </button>
        </div>

        {/* Folders */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {FOLDERS.map(f => (
            <button key={f.key} onClick={() => { setFolder(f.key); setSelected(null); setFilter('todos') }}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition',
                folder === f.key ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50')}>
              <f.icon size={13} className="shrink-0" />
              <span className="flex-1 text-left">{f.label}</span>
              {f.count > 0 && (
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  folder === f.key ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand')}>{f.count}</span>
              )}
            </button>
          ))}

          {/* Etiquetas */}
          <div className="mt-3 px-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Etiquetas</p>
              <button className="text-gray-400 hover:text-gray-600"><Plus size={11} /></button>
            </div>
            {ETIQUETAS.map(et => (
              <button key={et.key}
                className="w-full flex items-center gap-2 px-1 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: et.color }} />
                {et.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Font size + compact */}
        <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 mr-1">Letra</span>
            {(['A-sm','A-md','A-lg'] as FontSize[]).map((fs, i) => (
              <button key={fs} onClick={() => setFontSize(fs)}
                className={cn('font-semibold rounded transition px-1',
                  fontSize === fs ? 'text-brand' : 'text-gray-400 hover:text-gray-600',
                  i === 0 ? 'text-[10px]' : i === 1 ? 'text-xs' : 'text-sm')}>
                A
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400">Filas</span>
            <button onClick={() => setCompact(c => !c)}
              className={cn('text-[10px] px-2 py-0.5 rounded-lg border transition',
                compact ? 'bg-brand text-white border-brand' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
              Compacto
            </button>
          </div>
        </div>
      </div>

      {/* Mobile compose FAB */}
      <button onClick={() => setComposing(true)}
        className="md:hidden fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shadow-lg">
        <PenSquare size={18} />
      </button>

      {/* ── Email list ───────────────────────────────────────────── */}
      <div className={cn('w-full sm:w-80 shrink-0 flex-col border-r border-gray-100 bg-white', selected ? 'hidden sm:flex' : 'flex')}>
        {/* Header */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
              <Inbox size={15} />
              {FOLDERS.find(f2 => f2.key === folder)?.label ?? 'Bandeja'}
              {noLeidos > 0 && folder === 'bandeja' && (
                <span className="text-xs font-bold bg-brand text-white px-1.5 rounded-full">{noLeidos}</span>
              )}
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hidden sm:inline">{CORREO_CUENTA}</span>
            </div>
          </div>
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar correos..."
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand/30 bg-gray-50" />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={load}
              className="flex items-center gap-1 text-[11px] font-medium text-brand border border-brand/20 bg-brand/5 px-2.5 py-1 rounded-lg hover:bg-brand/10 transition">
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> Sincronizar
            </button>
            <button onClick={marcarTodoLeido}
              className="text-[11px] font-medium text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition">
              ✓ Leer todo
            </button>
          </div>
        </div>

        {/* Email rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : filtrados.length === 0 ? (
            <div className="p-8 text-center">
              <Mail size={30} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">Sin mensajes en esta carpeta</p>
            </div>
          ) : filtrados.map(m => (
            <div key={m.id}
              onClick={() => abrir(m)}
              className={cn('flex items-start gap-2 px-3 cursor-pointer transition group',
                compact ? 'py-1.5' : 'py-3',
                selected?.id === m.id ? 'bg-brand/5 border-l-2 border-brand' : 'hover:bg-gray-50',
                !m.leido && 'bg-blue-50/40')}>
              <div className="flex items-center gap-1 mt-0.5 shrink-0">
                <button onClick={e => { e.stopPropagation(); toggleCheck(m.id) }}
                  className="text-gray-300 hover:text-brand transition">
                  {checked.has(m.id) ? <CheckSquare size={13} className="text-brand" /> : <Square size={13} />}
                </button>
                <button onClick={e => { e.stopPropagation(); toggleEstrella(m.id) }}
                  className="text-gray-300 hover:text-yellow-400 transition">
                  <Star size={12} className={m.estrella ? 'fill-yellow-400 text-yellow-400' : ''} />
                </button>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-brand">{(m.de_nombre || m.de_email || '??').slice(0,2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn(fontClass, 'font-semibold truncate', !m.leido ? 'text-gray-900' : 'text-gray-600')}>{m.de_nombre || m.de_email}</p>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-1">{fmtFecha(m.created_at)}</span>
                </div>
                {!compact && (
                  <>
                    <p className={cn(fontClass, 'truncate', !m.leido ? 'font-semibold text-gray-800' : 'text-gray-600')}>{m.asunto}</p>
                    <p className="text-[10px] text-gray-400 truncate">{m.cuerpo}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Email detail ─────────────────────────────────────────── */}
      <div className={cn('flex-1 flex-col bg-white overflow-hidden', selected ? 'flex' : 'hidden sm:flex')}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail size={44} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm font-medium">Selecciona un mensaje para leerlo</p>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
              <button onClick={() => setSelected(null)} className="sm:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 transition"><X size={14} /></button>
              <button onClick={() => archivar(selected.id)} title="Archivar"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"><Archive size={14} /></button>
              <button onClick={() => eliminar(selected.id)} title="Eliminar"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"><Trash2 size={14} /></button>
              <button onClick={() => toggleEstrella(selected.id)} title="Destacar"
                className={cn('p-1.5 rounded-lg transition', selected.estrella ? 'text-yellow-400' : 'text-gray-400 hover:bg-gray-200')}>
                <Star size={14} className={selected.estrella ? 'fill-yellow-400' : ''} />
              </button>
              <button onClick={() => toggleLeido(selected.id)} title={selected.leido ? 'Marcar no leído' : 'Marcar leído'}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition">
                {selected.leido ? <Mail size={14} /> : <MailOpen size={14} />}
              </button>
              <div className="flex-1" />
              <div className="hidden md:flex items-center gap-1.5">
                {ETIQUETAS.map(et => (
                  <button key={et.key} title={et.label}
                    className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 transition">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: et.color }} />
                    {et.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">{selected.asunto}</h2>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand">{(selected.de_nombre || selected.de_email || '??').slice(0,2).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selected.de_nombre || selected.de_email}</p>
                  <p className="text-xs text-gray-400">{selected.de_email} · {fmtFecha(selected.created_at)}</p>
                </div>
              </div>
              <p className={cn(fontClass === 'text-[11px]' ? 'text-xs' : fontClass === 'text-sm' ? 'text-base' : 'text-sm',
                'text-gray-700 leading-relaxed whitespace-pre-wrap')}>
                {selected.cuerpo}
              </p>
            </div>

            {/* Reply */}
            {selected.direccion === 'entrante' && (
              <div className="border-t border-gray-100 p-3 sm:p-4">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-xs text-gray-400 font-medium">Para:</span>
                    <span className="text-xs text-gray-700 truncate">{selected.de_email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-100">
                    <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"><Bold size={12} /></button>
                    <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"><Italic size={12} /></button>
                    <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"><Underline size={12} /></button>
                    <div className="w-px h-4 bg-gray-200 mx-0.5" />
                    <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"><Link2 size={12} /></button>
                    <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"><Paperclip size={12} /></button>
                  </div>
                  <textarea value={reply} onChange={e => setReply(e.target.value)}
                    placeholder="Escribe tu respuesta..." rows={4}
                    className="w-full px-4 py-3 text-sm text-gray-700 focus:outline-none resize-none" />
                  <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                    <button onClick={() => setReply('')} className="text-xs text-gray-400 hover:text-red-500 transition">Descartar</button>
                    <button onClick={enviarRespuesta} disabled={!reply.trim() || sendingReply}
                      className="flex items-center gap-1.5 px-5 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:opacity-90 transition disabled:opacity-40">
                      {sendingReply ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Responder
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Compose modal ────────────────────────────────────────── */}
      {composing && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-end justify-center sm:justify-end p-0 sm:p-6">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[520px] flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h3 className="font-semibold text-gray-900 text-sm">Nuevo mensaje</h3>
              <button onClick={() => setComposing(false)} className="text-gray-400 hover:text-gray-700 transition"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-0">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
                <span className="text-xs text-gray-400 w-12">Para</span>
                <input value={newMsg.to} onChange={e => setNewMsg(n => ({ ...n, to: e.target.value }))}
                  className="flex-1 text-sm focus:outline-none" placeholder="destinatario@email.com" />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
                <span className="text-xs text-gray-400 w-12">Asunto</span>
                <input value={newMsg.subject} onChange={e => setNewMsg(n => ({ ...n, subject: e.target.value }))}
                  className="flex-1 text-sm focus:outline-none" placeholder="Asunto del correo" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-100">
              <button className="p-1 rounded hover:bg-gray-100 text-gray-400 transition"><Bold size={12} /></button>
              <button className="p-1 rounded hover:bg-gray-100 text-gray-400 transition"><Italic size={12} /></button>
              <button className="p-1 rounded hover:bg-gray-100 text-gray-400 transition"><Underline size={12} /></button>
              <div className="w-px h-4 bg-gray-200 mx-0.5" />
              <button className="p-1 rounded hover:bg-gray-100 text-gray-400 transition"><Paperclip size={12} /></button>
              <button className="p-1 rounded hover:bg-gray-100 text-gray-400 transition"><ImageIcon size={12} /></button>
            </div>
            <textarea value={newMsg.body} onChange={e => setNewMsg(n => ({ ...n, body: e.target.value }))}
              placeholder="Escribe tu mensaje..." rows={10}
              className="flex-1 px-4 py-3 text-sm focus:outline-none resize-none overflow-y-auto" />
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <button onClick={() => setComposing(false)} className="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-1">
                <Trash2 size={12} /> Descartar
              </button>
              <button onClick={enviarNuevo} disabled={sendingCompose}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-brand text-white rounded-xl text-xs font-semibold hover:opacity-90 transition disabled:opacity-50">
                {sendingCompose ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
