'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Bot, Plus, MessageSquare, FileText, Zap, Settings2,
  Trash2, ChevronRight, Leaf, ShoppingBag, Wrench, Sparkles,
  MoreVertical, X, Check, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BotItem {
  id: string
  name: string
  description: string
  mode: string
  provider: string
  model: string
  is_active: boolean
  avatar_color: string
  total_conversations: number
  total_messages: number
  total_tokens: number
  created_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MODE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  general:  { label: 'General',    icon: Bot,         color: 'bg-violet-100 text-violet-700' },
  sales:    { label: 'Consultor',  icon: ShoppingBag, color: 'bg-orange-100 text-orange-700' },
  technical:{ label: 'Técnico',    icon: Wrench,      color: 'bg-blue-100 text-blue-700' },
  agronomo: { label: 'Agrónomo',   icon: Leaf,        color: 'bg-green-100 text-green-700' },
}

const PROVIDER_LABELS: Record<string, string> = {
  openai:     'OpenAI',
  gemini:     'Gemini',
  openrouter: 'OpenRouter',
}

const DEFAULT_MODELS: Record<string, string[]> = {
  openai:     ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini:     ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
  openrouter: ['deepseek/deepseek-chat', 'anthropic/claude-3-haiku', 'meta-llama/llama-3.1-8b-instruct'],
}

const AVATAR_COLORS = [
  '#f5a623', '#ef4444', '#8b5cf6', '#3b82f6',
  '#10b981', '#f59e0b', '#ec4899', '#6366f1',
]

// ── Create Bot Modal ──────────────────────────────────────────────────────────

function CreateBotModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (bot: BotItem) => void
}) {
  const [form, setForm] = useState({
    name: '', description: '', mode: 'general',
    provider: 'openai', model: 'gpt-4o-mini',
    api_key: '', embedding_key: '',
    temperature: 0.7, max_tokens: 2048,
    personality: '', language: 'es',
    avatar_color: '#f5a623',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function handleCreate() {
    if (!form.name.trim()) return setError('El nombre es obligatorio')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreate(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
              <Sparkles size={17} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Nuevo Consultor IA</h2>
              <p className="text-xs text-gray-400">Configura tu asistente inteligente</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar color + Name */}
          <div className="flex gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Color</p>
              <div className="flex gap-1.5 flex-wrap w-20">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => set('avatar_color', c)}
                    style={{ backgroundColor: c }}
                    className={cn('w-7 h-7 rounded-lg transition-all', form.avatar_color === c && 'ring-2 ring-offset-1 ring-gray-400 scale-110')}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Nombre del BOT *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Ej: Asistente Agronómico"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Descripción</label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="¿Para qué sirve este bot?"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          {/* Mode */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Modo / Especialidad</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MODE_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => set('mode', key)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    form.mode === key
                      ? 'border-brand bg-brand/5 text-brand'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  <meta.icon size={15} />
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* Provider + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Proveedor IA</label>
              <select
                value={form.provider}
                onChange={e => { set('provider', e.target.value); set('model', DEFAULT_MODELS[e.target.value][0]) }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
              >
                {Object.entries(PROVIDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Modelo</label>
              <select
                value={form.model}
                onChange={e => set('model', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
              >
                {(DEFAULT_MODELS[form.provider] ?? []).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* API Keys */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">API Key ({PROVIDER_LABELS[form.provider]})</label>
            <input
              type="password"
              value={form.api_key}
              onChange={e => set('api_key', e.target.value)}
              placeholder="sk-..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          {form.provider !== 'openai' && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">OpenAI Key (para búsqueda semántica)</label>
              <input
                type="password"
                value={form.embedding_key}
                onChange={e => set('embedding_key', e.target.value)}
                placeholder="sk-... (opcional, activa RAG)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          )}

          {/* Temperature + Tokens */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Temperatura: {form.temperature}</label>
              <input
                type="range" min="0" max="1" step="0.1"
                value={form.temperature}
                onChange={e => set('temperature', parseFloat(e.target.value))}
                className="w-full accent-brand"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>Preciso</span><span>Creativo</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Tokens máximos</label>
              <input
                type="number" min="256" max="8192" step="256"
                value={form.max_tokens}
                onChange={e => set('max_tokens', parseInt(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </div>

          {/* Personality */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Personalidad del BOT</label>
            <textarea
              value={form.personality}
              onChange={e => set('personality', e.target.value)}
              rows={2}
              placeholder="Ej: Amigable, directo, usa lenguaje técnico agrícola, enfocado en resultados..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={15} />}
            Crear BOT
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bot Card ──────────────────────────────────────────────────────────────────

function BotCard({ bot, onDelete }: { bot: BotItem; onDelete: (id: string) => void }) {
  const [menu, setMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const mode = MODE_META[bot.mode] ?? MODE_META.general
  const ModeIcon = mode.icon

  async function handleDelete() {
    if (!confirm(`¿Eliminar el bot "${bot.name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    await fetch(`/api/bots/${bot.id}`, { method: 'DELETE' })
    onDelete(bot.id)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all group relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: bot.avatar_color + '20', border: `2px solid ${bot.avatar_color}30` }}
          >
            <Bot size={20} style={{ color: bot.avatar_color }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{bot.name}</h3>
            <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-0.5', mode.color)}>
              <ModeIcon size={10} />
              {mode.label}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenu(m => !m)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreVertical size={14} />
          </button>
          {menu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-lg z-10 min-w-[130px] py-1 overflow-hidden">
              <Link
                href={`/bot-ia/${bot.id}/admin`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings2 size={13} /> Configurar
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 w-full"
              >
                <Trash2 size={13} /> {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {bot.description && (
        <p className="text-xs text-gray-500 mb-4 line-clamp-2">{bot.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { icon: MessageSquare, label: 'Chats', value: bot.total_conversations },
          { icon: Zap,           label: 'Mensajes', value: bot.total_messages },
          { icon: FileText,      label: 'Tokens', value: (bot.total_tokens / 1000).toFixed(1) + 'k' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
            <Icon size={12} className="mx-auto text-gray-400 mb-0.5" />
            <p className="text-xs font-semibold text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Provider badge */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
          {PROVIDER_LABELS[bot.provider]} · {bot.model.split('/').pop()}
        </span>
        <div className={cn('w-2 h-2 rounded-full', bot.is_active ? 'bg-green-400' : 'bg-gray-300')} />
      </div>

      {/* Action button */}
      <Link
        href={`/bot-ia/${bot.id}`}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        <MessageSquare size={14} />
        Abrir Chat
        <ChevronRight size={13} />
      </Link>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BotIAPage() {
  const [bots, setBots] = useState<BotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetch('/api/bots')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setBots(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-sm">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Consultor BOT IA</h1>
            <p className="text-xs text-gray-400">Asistentes inteligentes personalizados</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90 transition-colors shadow-sm"
        >
          <Plus size={15} />
          Nuevo BOT
        </button>
      </header>

      <main className="flex-1 p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gray-100" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[1,2,3].map(j => <div key={j} className="h-14 bg-gray-100 rounded-xl" />)}
                </div>
                <div className="h-9 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mb-4">
              <Bot size={32} className="text-brand" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-2">No hay bots configurados</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              Crea tu primer asistente IA personalizado. Puedes entrenarlo con tus documentos y configurar su personalidad.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-3 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90 transition-colors"
            >
              <Plus size={16} />
              Crear primer BOT
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {bots.map(bot => (
              <BotCard
                key={bot.id}
                bot={bot}
                onDelete={id => setBots(b => b.filter(x => x.id !== id))}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateBotModal
          onClose={() => setShowCreate(false)}
          onCreate={bot => { setBots(b => [bot, ...b]); setShowCreate(false) }}
        />
      )}
    </div>
  )
}
