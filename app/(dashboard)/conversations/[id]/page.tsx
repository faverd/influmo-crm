'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Bot, BotOff, Ban, CheckCheck, Check, Send, Flame, TrendingUp, Snowflake,
} from 'lucide-react'
import Avatar from '@/components/avatar'
import LeadBadge from '@/components/lead-badge'
import { formatTime, formatDate, cn } from '@/lib/utils'
import type { Contact, Message, Lead } from '@/lib/supabase/types'

interface ConversationData {
  contact: Contact
  messages: Message[]
  lead: Lead | null
}

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'read') return <CheckCheck size={12} className="text-blue-400" />
  if (status === 'delivered') return <CheckCheck size={12} className="text-gray-400" />
  if (status === 'sent') return <Check size={12} className="text-gray-400" />
  return null
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<ConversationData | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    const r = await fetch(`/api/conversations/${id}`)
    setData(await r.json())
  }

  useEffect(() => { load() }, [id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [data?.messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    await fetch(`/api/conversations/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })
    setText('')
    setSending(false)
    await load()
  }

  async function toggleBot() {
    if (!data) return
    await fetch(`/api/conversations/${id}/bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_active: !data.contact.bot_active }),
    })
    await load()
  }

  async function toggleBlock() {
    if (!data) return
    if (data.contact.blocked || confirm('¿Bloquear este contacto?')) {
      await fetch(`/api/conversations/${id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: !data.contact.blocked }),
      })
      await load()
    }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Cargando conversación...
      </div>
    )
  }

  const { contact, messages, lead } = data

  // Group messages by date
  const groups: { date: string; msgs: Message[] }[] = []
  for (const m of messages) {
    const d = m.created_at.slice(0, 10)
    const last = groups[groups.length - 1]
    if (last?.date === d) last.msgs.push(m)
    else groups.push({ date: d, msgs: [m] })
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={() => router.push('/conversations')}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={16} className="text-gray-500" />
        </button>
        <Avatar name={contact.name} phone={contact.phone} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">{contact.name || contact.phone}</h2>
            <LeadBadge score={lead?.score ?? null} />
            {contact.blocked && (
              <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">Bloqueado</span>
            )}
          </div>
          <p className="text-xs text-gray-400">{contact.phone}</p>
        </div>
        {lead && (
          <div className="hidden md:flex bg-gray-50 rounded-[10px] p-3 text-xs text-gray-600 max-w-xs">
            <p className="line-clamp-2">{lead.reason}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleBot}
            title={contact.bot_active ? 'Desactivar bot' : 'Activar bot'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors',
              contact.bot_active
                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            {contact.bot_active ? <Bot size={14} /> : <BotOff size={14} />}
            {contact.bot_active ? 'Bot ON' : 'Bot OFF'}
          </button>
          <button
            onClick={toggleBlock}
            title={contact.blocked ? 'Desbloquear' : 'Bloquear'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors',
              contact.blocked
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'btn-outline'
            )}
          >
            <Ban size={14} />
            {contact.blocked ? 'Desbloqueado' : 'Bloquear'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {groups.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">{formatDate(date)}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="flex flex-col gap-2">
              {msgs.map(m => (
                <div
                  key={m.id}
                  className={cn('flex', m.role === 'user' ? 'justify-start' : 'justify-end')}
                >
                  <div className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                    m.role === 'user'
                      ? 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
                      : 'bg-brand text-white rounded-tr-sm'
                  )}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <div className={cn(
                      'flex items-center gap-1 mt-1',
                      m.role === 'user' ? 'justify-start' : 'justify-end'
                    )}>
                      <span className={cn('text-[10px]', m.role === 'user' ? 'text-gray-400' : 'text-white/60')}>
                        {formatTime(m.created_at)}
                      </span>
                      {m.role === 'assistant' && <StatusIcon status={m.status} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-6 py-4 shrink-0">
        {contact.blocked ? (
          <div className="text-center text-sm text-red-500 py-2">
            Contacto bloqueado — no se pueden enviar mensajes
          </div>
        ) : (
          <form onSubmit={sendMessage} className="flex items-end gap-3">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as any) }
              }}
              placeholder="Escribí un mensaje manual..."
              rows={1}
              className="input flex-1 resize-none"
              style={{ minHeight: 40, maxHeight: 120 }}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="btn-primary h-10 px-4 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
