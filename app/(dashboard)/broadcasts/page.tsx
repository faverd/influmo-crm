'use client'

import { useEffect, useState } from 'react'
import { Send, Users, CheckSquare, Square, Flame, TrendingUp, Snowflake, CheckCircle, XCircle, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Contact {
  id: string
  phone: string
  name: string | null
  lead_score: 'hot' | 'warm' | 'cold' | null
  message_count: number
}

const SCORE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'hot', label: 'HOT', icon: Flame, color: 'text-red-500' },
  { value: 'warm', label: 'WARM', icon: TrendingUp, color: 'text-amber-500' },
  { value: 'cold', label: 'COLD', icon: Snowflake, color: 'text-gray-400' },
]

export default function BroadcastsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null)

  useEffect(() => {
    fetch('/api/conversations')
      .then(r => r.json())
      .then(data => { setContacts(data); setLoading(false) })
  }, [])

  const filtered = filter
    ? contacts.filter(c => c.lead_score === filter)
    : contacts

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  async function handleSend() {
    if (!message.trim() || selected.size === 0 || sending) return
    if (!confirm(`¿Enviar mensaje a ${selected.size} contacto${selected.size > 1 ? 's' : ''}?`)) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: Array.from(selected), message }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        setMessage('')
        setSelected(new Set())
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone size={22} className="text-gray-700" />
            Difusión
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Enviá un mensaje a múltiples contactos a la vez</p>
        </div>
      </div>

      {/* Message composer */}
      <div className="card flex flex-col gap-3">
        <h2 className="font-semibold text-gray-900">Mensaje</h2>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Escribí el mensaje que querés enviar..."
          rows={4}
          className="input resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {selected.size > 0
              ? `${selected.size} contacto${selected.size > 1 ? 's' : ''} seleccionado${selected.size > 1 ? 's' : ''}`
              : 'Seleccioná destinatarios abajo'}
          </span>
          <button
            onClick={handleSend}
            disabled={!message.trim() || selected.size === 0 || sending}
            className="btn-primary disabled:opacity-50"
          >
            <Send size={15} />
            {sending ? 'Enviando...' : `Enviar a ${selected.size}`}
          </button>
        </div>

        {result && (
          <div className={cn(
            'flex items-center gap-2 text-sm px-3 py-2 rounded-lg',
            result.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          )}>
            {result.failed === 0 ? <CheckCircle size={14} /> : <XCircle size={14} />}
            Enviados: {result.sent}/{result.total}
            {result.failed > 0 && ` · Fallidos: ${result.failed}`}
          </div>
        )}
      </div>

      {/* Contact list */}
      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Destinatarios</h2>
          <div className="flex items-center gap-1">
            {SCORE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => { setFilter(f.value); setSelected(new Set()) }}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                  filter === f.value
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Select all row */}
        {!loading && filtered.length > 0 && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm text-brand font-medium hover:opacity-80 transition-opacity"
          >
            {selected.size === filtered.length
              ? <CheckSquare size={16} />
              : <Square size={16} />}
            {selected.size === filtered.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            <span className="text-gray-400 font-normal">({filtered.length})</span>
          </button>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay contactos</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {filtered.map(c => {
              const isSelected = selected.has(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={cn(
                    'flex items-center gap-3 py-3 first:pt-0 last:pb-0 text-left transition-colors rounded-lg px-2 -mx-2',
                    isSelected && 'bg-brand-light'
                  )}
                >
                  {isSelected ? (
                    <CheckSquare size={16} className="text-brand shrink-0" />
                  ) : (
                    <Square size={16} className="text-gray-300 shrink-0" />
                  )}
                  <div className="w-9 h-9 rounded-full bg-brand-light border border-brand/20 flex items-center justify-center shrink-0">
                    <span className="text-brand text-xs font-bold">
                      {(c.name || c.phone).slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name || c.phone}</p>
                    <p className="text-xs text-gray-400">{c.phone} · {c.message_count} mensajes</p>
                  </div>
                  {c.lead_score === 'hot' && <Flame size={14} className="text-red-400 shrink-0" />}
                  {c.lead_score === 'warm' && <TrendingUp size={14} className="text-amber-400 shrink-0" />}
                  {c.lead_score === 'cold' && <Snowflake size={14} className="text-gray-300 shrink-0" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
