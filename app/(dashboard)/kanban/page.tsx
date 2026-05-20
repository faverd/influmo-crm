'use client'

import { useEffect, useState } from 'react'
import { Flame, TrendingUp, Snowflake, Plus, MessageSquare, MoreHorizontal, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Contact {
  id: string
  phone: string
  name: string | null
  lead_score: 'hot' | 'warm' | 'cold' | null
  last_message: string | null
  last_message_at: string | null
  message_count: number
  bot_active: boolean
}

const COLUMNS = [
  {
    id: 'new',
    label: 'Nuevos',
    color: 'bg-blue-500',
    light: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    filter: (c: Contact) => c.lead_score === null,
  },
  {
    id: 'hot',
    label: 'HOT 🔥',
    color: 'bg-red-500',
    light: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    filter: (c: Contact) => c.lead_score === 'hot',
  },
  {
    id: 'warm',
    label: 'WARM 📈',
    color: 'bg-amber-500',
    light: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    filter: (c: Contact) => c.lead_score === 'warm',
  },
  {
    id: 'cold',
    label: 'COLD ❄️',
    color: 'bg-gray-400',
    light: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    filter: (c: Contact) => c.lead_score === 'cold',
  },
]

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'hace minutos'
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function ContactCard({ contact }: { contact: Contact }) {
  const initials = (contact.name || contact.phone).slice(0, 2).toUpperCase()

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-3.5 hover:shadow-card-hover transition-shadow group">
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center shrink-0">
            <span className="text-brand text-xs font-bold">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {contact.name || contact.phone}
            </p>
            {contact.name && (
              <p className="text-xs text-gray-400">{contact.phone}</p>
            )}
          </div>
        </div>
        <Link
          href={`/conversations/${contact.id}`}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-brand hover:text-white transition-all"
        >
          <ChevronRight size={12} />
        </Link>
      </div>

      {contact.last_message && (
        <p className="text-xs text-gray-500 mb-2.5 line-clamp-2 leading-relaxed">
          {contact.last_message}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <MessageSquare size={11} />
          <span>{contact.message_count}</span>
          {contact.last_message_at && (
            <span className="ml-1">· {timeAgo(contact.last_message_at)}</span>
          )}
        </div>
        <div className={cn(
          'w-2 h-2 rounded-full',
          contact.bot_active ? 'bg-green-400' : 'bg-gray-300'
        )} title={contact.bot_active ? 'Bot activo' : 'Bot pausado'} />
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/conversations')
      .then(r => r.json())
      .then(data => { setContacts(data); setLoading(false) })
  }, [])

  return (
    <div className="p-6 h-screen flex flex-col gap-5 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kanban</h1>
          <p className="text-sm text-gray-500 mt-0.5">Panel visual de leads — {contacts.length} contactos</p>
        </div>
        <Link href="/conversations" className="btn-outline text-sm">
          <MessageSquare size={15} />
          Ver conversaciones
        </Link>
      </div>

      {/* Board */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-x-auto pb-2">
        {COLUMNS.map(col => {
          const cards = contacts.filter(col.filter)
          return (
            <div key={col.id} className="flex flex-col w-72 shrink-0">
              {/* Column header */}
              <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-xl mb-2', col.light, `border ${col.border}`)}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2.5 h-2.5 rounded-full', col.color)} />
                  <span className={cn('text-sm font-semibold', col.text)}>{col.label}</span>
                  <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', col.light, col.text, `border ${col.border}`)}>
                    {loading ? '—' : cards.length}
                  </span>
                </div>
                <button className={cn('w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity', col.light)}>
                  <MoreHorizontal size={14} className={col.text} />
                </button>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 pr-0.5">
                {loading ? (
                  Array(3).fill(null).map((_, i) => (
                    <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
                  ))
                ) : cards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-2', col.light)}>
                      <Plus size={16} className={col.text} />
                    </div>
                    <p className="text-xs text-gray-400">Sin contactos</p>
                  </div>
                ) : (
                  cards.map(c => <ContactCard key={c.id} contact={c} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
