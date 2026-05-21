'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Bot, Send, Settings2, Plus, Trash2, History,
  ChevronLeft, Leaf, ShoppingBag, Wrench, Loader2,
  User, Copy, Check, AlertCircle, X, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BotConfig {
  id: string; name: string; description: string; mode: string
  provider: string; model: string; avatar_color: string; is_active: boolean
}

interface Message {
  id: string; role: 'user' | 'assistant'; content: string; created_at?: string
}

interface Conversation {
  id: string; title: string; updated_at: string
}

// ── Markdown renderer (minimal, no extra deps) ────────────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-50 border border-gray-200 rounded-xl p-3 overflow-x-auto text-xs font-mono my-2 whitespace-pre-wrap"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-3 mb-1">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-2 mb-1">$1</h3>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>')
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, avatarColor }: { msg: Message; avatarColor: string }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  function copy() {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={cn('flex gap-3 group', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          isUser ? 'bg-gray-200' : ''
        )}
        style={!isUser ? { backgroundColor: avatarColor + '20', border: `1.5px solid ${avatarColor}30` } : {}}
      >
        {isUser
          ? <User size={14} className="text-gray-600" />
          : <Bot size={14} style={{ color: avatarColor }} />
        }
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[75%] relative', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-gray-900 text-white rounded-tr-sm'
              : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div
              className="prose-sm"
              dangerouslySetInnerHTML={{ __html: '<p>' + renderMarkdown(msg.content) + '</p>' }}
            />
          )}
        </div>
        <button
          onClick={copy}
          className="absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 flex items-center gap-1"
          style={isUser ? { right: 0 } : { left: 0 }}
        >
          {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
          <span className="text-[10px]">{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingDots({ color }: { color: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20' }}>
        <Bot size={14} style={{ color }} />
      </div>
      <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
        {[0,1,2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ backgroundColor: color, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Mode icon ─────────────────────────────────────────────────────────────────

const MODE_ICONS: Record<string, React.ElementType> = {
  general: Bot, sales: ShoppingBag, technical: Wrench, agronomo: Leaf,
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BotChatPage() {
  const params = useParams<{ id: string }>()
  const botId = params.id

  const [bot, setBot] = useState<BotConfig | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)

  // Load bot config + conversations
  useEffect(() => {
    Promise.all([
      fetch(`/api/bots/${botId}`).then(r => r.json()).catch(() => null),
      fetch(`/api/bots/${botId}/conversations`).then(r => r.json()).catch(() => []),
    ]).then(([b, convs]) => {
      if (b && !b.error) setBot(b)
      if (Array.isArray(convs)) setConversations(convs)
    })
  }, [botId])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Load conversation messages
  const loadConversation = useCallback(async (convId: string) => {
    setLoadingMsgs(true)
    setActiveConvId(convId)
    setShowHistory(false)
    const res = await fetch(`/api/bots/${botId}/conversations?conversationId=${convId}`)
    const data = await res.json()
    setMessages(Array.isArray(data) ? data : [])
    setLoadingMsgs(false)
  }, [botId])

  // New conversation
  function newConversation() {
    setActiveConvId(null)
    setMessages([])
    setStreamingContent('')
    setError('')
  }

  // Send message
  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return
    setInput(''); setError('')

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true); setStreamingContent('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`/api/bots/${botId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: activeConvId }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`Error ${res.status}`)
      if (!res.body) throw new Error('Sin respuesta streaming')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''; let full = ''; let newConvId = activeConvId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'meta') {
              newConvId = ev.conversationId
              setActiveConvId(ev.conversationId)
            } else if (ev.type === 'token') {
              full += ev.content
              setStreamingContent(full)
            } else if (ev.type === 'done') {
              const assistantMsg: Message = {
                id: ev.messageId ?? crypto.randomUUID(),
                role: 'assistant',
                content: full,
              }
              setMessages(prev => [...prev, assistantMsg])
              setStreamingContent('')
              // Refresh conversation list
              if (newConvId) {
                fetch(`/api/bots/${botId}/conversations`)
                  .then(r => r.json())
                  .then(convs => { if (Array.isArray(convs)) setConversations(convs) })
              }
            } else if (ev.type === 'error') {
              setError(ev.message)
              setStreamingContent('')
            }
          } catch { /* skip */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError(`Error: ${e}`)
        setStreamingContent('')
      }
    } finally {
      setStreaming(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function stop() { abortRef.current?.abort(); setStreaming(false); setStreamingContent('') }

  const ModeIcon = bot ? (MODE_ICONS[bot.mode] ?? Bot) : Bot
  const color = bot?.avatar_color ?? '#f5a623'

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Conversation history sidebar */}
      <aside className={cn(
        'flex flex-col border-r border-gray-100 bg-white transition-all duration-200 shrink-0',
        showHistory ? 'w-72' : 'w-0 overflow-hidden'
      )}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
            <History size={15} /> Historial
          </h3>
          <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        </div>
        <button
          onClick={newConversation}
          className="mx-3 mt-3 mb-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-brand hover:text-brand transition-colors"
        >
          <Plus size={14} /> Nueva conversación
        </button>
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors mb-0.5',
                activeConvId === conv.id ? 'bg-brand/10 text-brand font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <p className="truncate font-medium">{conv.title}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: es })}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
          <Link href="/bot-ia" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <ChevronLeft size={18} />
          </Link>

          <button
            onClick={() => setShowHistory(h => !h)}
            className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-colors', showHistory ? 'bg-brand/10 text-brand' : 'hover:bg-gray-100 text-gray-400')}
          >
            <History size={16} />
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20' }}>
              <ModeIcon size={16} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{bot?.name ?? 'Cargando...'}</p>
              <p className="text-[11px] text-gray-400 truncate">{bot?.description || bot?.model}</p>
            </div>
          </div>

          <button
            onClick={newConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus size={13} /> Nuevo chat
          </button>

          <Link
            href={`/bot-ia/${botId}/admin`}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <Settings2 size={16} />
          </Link>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {loadingMsgs ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : messages.length === 0 && !streamingContent ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm" style={{ backgroundColor: color + '15' }}>
                <ModeIcon size={28} style={{ color }} />
              </div>
              <h2 className="font-bold text-gray-900 text-xl mb-2">{bot?.name}</h2>
              <p className="text-sm text-gray-500 max-w-md mb-6">
                {bot?.description || 'Soy tu asistente IA personalizado. ¿En qué puedo ayudarte hoy?'}
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                {getStarters(bot?.mode ?? 'general').map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus() }}
                    className="text-left px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} avatarColor={color} />
              ))}
              {streaming && !streamingContent && <TypingDots color={color} />}
              {streamingContent && (
                <MessageBubble
                  msg={{ id: 'streaming', role: 'assistant', content: streamingContent }}
                  avatarColor={color}
                />
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={15} />
                  {error}
                  <button onClick={() => setError('')} className="ml-auto"><X size={13} /></button>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-brand/40 focus-within:bg-white transition-all px-4 py-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder={`Escribe tu consulta a ${bot?.name ?? 'el BOT'}...`}
                disabled={streaming}
                className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none max-h-36 disabled:opacity-50"
                style={{ lineHeight: '1.5' }}
              />
              {streaming ? (
                <button
                  onClick={stop}
                  className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors shrink-0"
                >
                  <MessageSquare size={14} />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-colors shrink-0 disabled:opacity-30"
                  style={{ backgroundColor: color }}
                >
                  <Send size={14} />
                </button>
              )}
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-2">
              {streaming ? 'Generando respuesta...' : 'Enter para enviar · Shift+Enter para nueva línea'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStarters(mode: string): string[] {
  const starters: Record<string, string[]> = {
    general:  ['¿Cuál es tu función principal?', '¿Qué información tienes disponible?', 'Ayúdame con una consulta', 'Dame un resumen del tema'],
    sales:    ['¿Qué productos recomiendas?', 'Necesito una cotización', 'Comparar productos similares', '¿Cuál tiene mejor relación precio/calidad?'],
    technical:['¿Cómo funciona este producto?', 'Especificaciones técnicas', 'Guía de instalación', 'Resolución de problemas'],
    agronomo: ['¿Qué fertilizante usar en maíz?', 'Control de plagas en tomate', 'Programa de riego recomendado', 'Compatibilidad de agroquímicos'],
  }
  return starters[mode] ?? starters.general
}
