'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Filter } from 'lucide-react'
import Avatar from '@/components/avatar'
import LeadBadge from '@/components/lead-badge'
import { formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  phone: string
  name: string | null
  blocked: boolean
  bot_active: boolean
  last_message: string | null
  last_message_at: string | null
  last_message_role: 'user' | 'assistant' | null
  message_count: number
  lead_score: 'hot' | 'warm' | 'cold' | null
  ad_source: string | null
}

const SCORE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'hot', label: '🔥 HOT' },
  { value: 'warm', label: '📈 WARM' },
  { value: 'cold', label: '❄️ COLD' },
]

export default function ConversationsPage() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [q, setQ] = useState('')
  const [score, setScore] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (score) params.set('score', score)
    fetch(`/api/conversations?${params}`)
      .then(r => r.json())
      .then(data => { setConvs(data); setLoading(false) })
  }, [q, score])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">{convs.length} contactos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Buscar por nombre o teléfono..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 bg-white rounded-[10px] border border-gray-200 p-1">
          {SCORE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setScore(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors',
                score === f.value ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : convs.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No hay conversaciones aún</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {convs.map(c => (
              <li key={c.id}>
                <Link
                  href={`/conversations/${c.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <Avatar name={c.name} phone={c.phone} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900 text-sm">
                        {c.name || c.phone}
                      </span>
                      {c.name && (
                        <span className="text-xs text-gray-400">{c.phone}</span>
                      )}
                      <LeadBadge score={c.lead_score} size="sm" />
                      {!c.bot_active && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                          Bot OFF
                        </span>
                      )}
                      {c.blocked && (
                        <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-medium">
                          Bloqueado
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      'text-sm truncate',
                      c.last_message_role === 'user' ? 'text-gray-700 font-medium' : 'text-gray-400'
                    )}>
                      {c.last_message_role === 'assistant' && <span className="text-gray-400">Berta: </span>}
                      {c.last_message ?? 'Sin mensajes'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs text-gray-400">
                      {c.last_message_at ? formatRelative(c.last_message_at) : ''}
                    </span>
                    <span className="text-xs text-gray-400">{c.message_count} msgs</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
