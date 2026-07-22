'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, MoreVertical, Paperclip, Smile, Send, Loader2,
  Phone, Video, Check, CheckCheck, Image as ImageIcon,
  FileText, Camera, User as UserIcon, MessageSquareText, Archive,
  Star, Settings, RefreshCw, LogOut, Ban, Bot, BotOff, ExternalLink,
  AlertTriangle, ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Conversation {
  id: string; phone: string; name: string | null; created_at: string
  ad_source: string | null; blocked: boolean; bot_active: boolean
  last_message: string | null; last_message_at: string | null
  last_message_role: string | null; message_count: number
  lead_score: 'hot'|'warm'|'cold'|null
}
interface Msg {
  id: string; contact_id: string; role: 'user'|'assistant'; content: string
  created_at: string; whatsapp_message_id: string | null
  status: 'sent'|'delivered'|'read'|'failed'|null
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

// ─── Not-connected screen ────────────────────────────────────────────────────
function SetupScreen({ verifyTokenSet }: { verifyTokenSet: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#f7f8fa] p-8">
      <div className="max-w-xl w-full">
        <div className="w-16 h-16 bg-[#25D366] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <MessageSquareText size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-light text-gray-700 mb-2 text-center">Conecta WhatsApp Business Cloud API</h1>
        <p className="text-sm text-gray-500 mb-8 text-center">Faltan credenciales de Meta for Developers para activar el envío y recepción real de mensajes</p>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Crea una app en Meta for Developers</p>
              <p className="text-xs text-gray-500 mt-0.5">developers.facebook.com → Mis apps → Crear app → tipo &quot;Empresa&quot; → agregar producto WhatsApp</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Copia el Phone Number ID y el Token permanente</p>
              <p className="text-xs text-gray-500 mt-0.5">WhatsApp → Empezar → API Setup. Genera un token de usuario del sistema permanente (no el temporal de 24h)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Configura el Webhook</p>
              <p className="text-xs text-gray-500 mt-0.5">URL de callback: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">https://influmo-crm.vercel.app/api/webhook</code></p>
              <p className="text-xs text-gray-500 mt-0.5">Verify token: el mismo valor que pongas en <code className="bg-gray-100 px-1 rounded text-[11px]">WHATSAPP_VERIFY_TOKEN</code> · Suscríbete al campo <strong>messages</strong></p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 text-xs font-bold">4</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Agrega las variables de entorno en Vercel</p>
              <div className="mt-1.5 bg-gray-900 rounded-lg px-3 py-2.5 font-mono text-[11px] text-gray-200 space-y-0.5">
                <p>WHATSAPP_PHONE_NUMBER_ID=<span className="text-emerald-400">tu_phone_number_id</span></p>
                <p>WHATSAPP_ACCESS_TOKEN=<span className="text-emerald-400">tu_token_permanente</span></p>
                <p>WHATSAPP_VERIFY_TOKEN=<span className="text-emerald-400">un_secreto_que_tu_eliges</span></p>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Vercel → tu proyecto → Settings → Environment Variables → Redeploy</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700">
          {verifyTokenSet ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
          {verifyTokenSet
            ? 'WHATSAPP_VERIFY_TOKEN detectado. Falta el Phone Number ID y/o Access Token.'
            : 'Ninguna variable de entorno de WhatsApp detectada todavía.'}
        </div>

        <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer"
          className="mt-5 flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition">
          <ExternalLink size={14} /> Ir a Meta for Developers
        </a>
      </div>
    </div>
  )
}

// ─── Lead badge ──────────────────────────────────────────────────────────────
function LeadBadge({ score }: { score: 'hot'|'warm'|'cold'|null }) {
  if (!score) return null
  const meta = {
    hot:  { label: '🔥 Caliente', cls: 'bg-red-100 text-red-600' },
    warm: { label: '🌤️ Tibio',    cls: 'bg-amber-100 text-amber-600' },
    cold: { label: '❄️ Frío',      cls: 'bg-blue-100 text-blue-600' },
  }[score]
  return <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', meta.cls)}>{meta.label}</span>
}

// ─── Chat list item ──────────────────────────────────────────────────────────
function ChatItem({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const unread = conv.last_message_role === 'user'
  const initials = (conv.name || conv.phone).slice(0, 2).toUpperCase()
  return (
    <button onClick={onClick}
      className={cn('w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition text-left border-b border-gray-50',
        active && 'bg-gray-100')}>
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">{initials}</span>
        </div>
        {conv.blocked && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
            <Ban size={8} className="text-white" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{conv.name || conv.phone}</p>
          <span className={cn('text-[11px] shrink-0', unread ? 'text-green-600 font-semibold' : 'text-gray-400')}>{timeAgo(conv.last_message_at)}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs text-gray-500 truncate flex-1">{conv.last_message || 'Sin mensajes'}</p>
          <LeadBadge score={conv.lead_score} />
        </div>
      </div>
    </button>
  )
}

// ─── Main WhatsApp Page ──────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const [status, setStatus] = useState<{ connected: boolean; verify_token_set: boolean } | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [filter, setFilter] = useState<'todos'|'no_leidos'|'hot'>('todos')
  const scrollRef = useRef<HTMLDivElement>(null)

  const selected = conversations.find(c => c.id === selectedId) ?? null

  const loadStatus = useCallback(() => {
    fetch('/api/whatsapp/status').then(r => r.json()).then(d => {
      setStatus({ connected: d.connected, verify_token_set: d.webhook_verify_token_set })
    }).catch(() => setStatus({ connected: false, verify_token_set: false }))
  }, [])

  const loadConversations = useCallback(() => {
    setLoading(true)
    fetch('/api/conversations').then(r => r.json()).then(d => {
      setConversations(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadStatus(); loadConversations() }, [loadStatus, loadConversations])

  useEffect(() => {
    if (!selectedId) return
    setLoadingMsgs(true)
    fetch(`/api/conversations/${selectedId}`).then(r => r.json()).then(d => {
      setMessages(d.messages ?? [])
      setLoadingMsgs(false)
    }).catch(() => setLoadingMsgs(false))
  }, [selectedId])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }, [messages.length])

  async function sendMessage() {
    if (!draft.trim() || !selectedId || sending) return
    setSending(true)
    const text = draft.trim()
    setDraft('')
    try {
      const res = await fetch(`/api/conversations/${selectedId}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }),
      })
      if (res.ok) {
        setMessages(m => [...m, {
          id: Date.now().toString(), contact_id: selectedId, role: 'assistant', content: text,
          created_at: new Date().toISOString(), whatsapp_message_id: null, status: 'sent',
        }])
        loadConversations()
      }
    } finally { setSending(false) }
  }

  async function toggleBlock(id: string, blocked: boolean) {
    await fetch(`/api/conversations/${id}/block`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blocked: !blocked }) })
    loadConversations()
  }
  async function toggleBot(id: string, botActive: boolean) {
    await fetch(`/api/conversations/${id}/bot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bot_active: !botActive }) })
    loadConversations()
  }

  const filtered = conversations.filter(c => {
    if (filter === 'no_leidos' && c.last_message_role !== 'user') return false
    if (filter === 'hot' && c.lead_score !== 'hot') return false
    const q = search.toLowerCase()
    return !q || (c.name || '').toLowerCase().includes(q) || c.phone.includes(q)
  })

  if (status && !status.connected) {
    return <div className="flex h-screen flex-col"><SetupScreen verifyTokenSet={status.verify_token_set} /></div>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f5]">
      {/* ── Chat list panel ──────────────────────────────────────── */}
      <div className="w-[380px] shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
              <MessageSquareText size={16} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-700 block leading-tight">WhatsApp Business</span>
              <span className="text-[10px] text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Conectado</span>
            </div>
          </div>
          <div className="flex items-center gap-1 relative">
            <button onClick={loadConversations} title="Actualizar" className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowMenu(s => !s)} title="Menú" className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"><MoreVertical size={17} /></button>
            {showMenu && (
              <div className="absolute top-10 right-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 w-52 z-20">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-[10px] text-gray-400">Número conectado</p>
                  <p className="text-xs font-mono text-gray-700 truncate">{process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? 'API Cloud oficial'}</p>
                </div>
                <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"><Archive size={14} /> Chats archivados</button>
                <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"><Star size={14} /> Leads calificados</button>
                <Link href="/settings" className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"><Settings size={14} /> Configuración</Link>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar o iniciar un chat nuevo"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f0f2f5] rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400" />
          </div>
          <div className="flex gap-1.5 mt-2">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'no_leidos', label: 'Sin responder' },
              { key: 'hot', label: '🔥 Hot leads' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
                className={cn('text-[11px] font-medium px-2.5 py-1 rounded-full transition',
                  filter === f.key ? 'bg-[#25D366]/10 text-[#128C4A]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquareText size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">Sin conversaciones todavía</p>
              <p className="text-[11px] text-gray-300 mt-1">Los mensajes entrantes por WhatsApp aparecerán aquí automáticamente</p>
            </div>
          ) : filtered.map(conv => (
            <ChatItem key={conv.id} conv={conv} active={conv.id === selectedId} onClick={() => setSelectedId(conv.id)} />
          ))}
        </div>
      </div>

      {/* ── Conversation panel ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative"
        style={{ backgroundColor: '#efeae2', backgroundImage: 'radial-gradient(#d9d3c7 0.5px, transparent 0.5px)', backgroundSize: '18px 18px' }}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-64 h-64 rounded-full bg-white/40 flex items-center justify-center mb-6">
              <MessageSquareText size={80} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-light text-gray-600 mb-2">WhatsApp Business Web</h2>
            <p className="text-sm text-gray-500 max-w-sm">Selecciona una conversación para ver los mensajes en tiempo real</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 z-10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{(selected.name || selected.phone).slice(0,2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
                  {selected.name || selected.phone}
                  <LeadBadge score={selected.lead_score} />
                </p>
                <p className="text-xs text-gray-500">{selected.phone}{selected.ad_source ? ` · Origen: ${selected.ad_source}` : ''}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleBot(selected.id, selected.bot_active)}
                  title={selected.bot_active ? 'Desactivar BOT IA' : 'Activar BOT IA'}
                  className={cn('p-2 rounded-full transition', selected.bot_active ? 'text-brand hover:bg-brand/10' : 'text-gray-400 hover:bg-gray-200')}>
                  {selected.bot_active ? <Bot size={17} /> : <BotOff size={17} />}
                </button>
                <button onClick={() => toggleBlock(selected.id, selected.blocked)}
                  title={selected.blocked ? 'Desbloquear' : 'Bloquear'}
                  className={cn('p-2 rounded-full transition', selected.blocked ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-200')}>
                  <Ban size={16} />
                </button>
                <button className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"><Video size={17} /></button>
                <button className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"><Phone size={16} /></button>
              </div>
            </div>

            {selected.blocked && (
              <div className="bg-red-50 text-red-600 text-xs px-4 py-2 flex items-center gap-2 z-10">
                <Ban size={12} /> Este contacto está bloqueado — no recibirá tus mensajes hasta desbloquearlo
              </div>
            )}
            {!selected.bot_active && (
              <div className="bg-amber-50 text-amber-700 text-xs px-4 py-2 flex items-center gap-2 z-10">
                <BotOff size={12} /> BOT IA desactivado en esta conversación — respondes tú manualmente
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 sm:px-16 py-4 space-y-1.5 z-10">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-10">Sin mensajes aún</p>
              ) : messages.map(m => {
                const propio = m.role === 'assistant'
                return (
                  <div key={m.id} className={cn('flex', propio ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[65%] rounded-lg px-3 py-1.5 shadow-sm relative', propio ? 'bg-[#d9fdd3]' : 'bg-white')}>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap pr-10">{m.content}</p>
                      <span className="absolute bottom-1 right-2 flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">{timeAgo(m.created_at)}</span>
                        {propio && (
                          m.status === 'read'
                            ? <CheckCheck size={13} className="text-blue-500" />
                            : m.status === 'delivered'
                              ? <CheckCheck size={13} className="text-gray-400" />
                              : m.status === 'failed'
                                ? <span className="text-[10px] text-red-500">✕</span>
                                : <Check size={13} className="text-gray-400" />
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Input bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f0f2f5] border-t border-gray-200 z-10 relative">
              <button onClick={() => setShowAttach(s => !s)} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"><Smile size={20} /></button>
              <div className="relative">
                <button onClick={() => setShowAttach(s => !s)} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"><Paperclip size={20} /></button>
                {showAttach && (
                  <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-lg border border-gray-100 p-2 grid grid-cols-2 gap-1 w-40 z-20">
                    {[
                      { icon: ImageIcon, label: 'Fotos', color: 'text-purple-500' },
                      { icon: FileText, label: 'Documento', color: 'text-blue-500' },
                      { icon: Camera, label: 'Cámara', color: 'text-pink-500' },
                      { icon: UserIcon, label: 'Contacto', color: 'text-cyan-600' },
                    ].map(a => (
                      <button key={a.label} onClick={() => setShowAttach(false)}
                        title="Próximamente — multimedia vía Cloud API"
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition">
                        <a.icon size={18} className={a.color} />
                        <span className="text-[10px] text-gray-500">{a.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                disabled={selected.blocked}
                placeholder={selected.blocked ? 'Desbloquea el contacto para escribir' : 'Escribe un mensaje'}
                className="flex-1 px-4 py-2.5 rounded-full bg-white text-sm focus:outline-none disabled:opacity-50" />
              <button onClick={sendMessage} disabled={!draft.trim() || sending || selected.blocked}
                className="p-2.5 rounded-full bg-[#25D366] text-white hover:opacity-90 transition disabled:opacity-40">
                {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
