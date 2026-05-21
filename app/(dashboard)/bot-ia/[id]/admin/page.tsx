'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Bot, Settings2, FileText, BarChart3, ChevronLeft,
  Plus, Trash2, RefreshCw, Check, AlertCircle, Upload,
  Globe, Type, FileType, Loader2, X, CheckCircle2,
  Clock, Zap, MessageSquare, Save, Eye, EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BotConfig {
  id: string; name: string; description: string; mode: string
  provider: string; model: string; api_key: string; embedding_key: string
  temperature: number; max_tokens: number; personality: string
  language: string; system_prompt: string; is_active: boolean
  avatar_color: string; total_conversations: number; total_messages: number; total_tokens: number
}

interface BotDocument {
  id: string; name: string; type: string; file_path: string | null
  original_url: string | null; file_size: number; chunk_count: number
  status: 'pending' | 'processing' | 'ready' | 'error'; error_message: string | null
  created_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PROVIDER_MODELS: Record<string, string[]> = {
  openai:     ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini:     ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
  openrouter: ['deepseek/deepseek-chat', 'anthropic/claude-3-haiku', 'meta-llama/llama-3.1-8b-instruct'],
}

const AVATAR_COLORS = ['#f5a623','#ef4444','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ec4899','#6366f1']

const DOC_STATUS_META = {
  pending:    { label: 'Pendiente',    color: 'text-yellow-600 bg-yellow-50',  icon: Clock },
  processing: { label: 'Procesando',  color: 'text-blue-600 bg-blue-50',      icon: Loader2 },
  ready:      { label: 'Listo',        color: 'text-green-600 bg-green-50',    icon: CheckCircle2 },
  error:      { label: 'Error',        color: 'text-red-600 bg-red-50',        icon: AlertCircle },
}

function formatSize(b: number) {
  if (b < 1024) return `${b}B`
  if (b < 1048576) return `${(b/1024).toFixed(1)}KB`
  return `${(b/1048576).toFixed(1)}MB`
}

// ── Tab: Configuration ────────────────────────────────────────────────────────

function ConfigTab({ bot, onSave }: { bot: BotConfig; onSave: (b: BotConfig) => void }) {
  const [form, setForm] = useState<BotConfig>(bot)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState({ api: false, emb: false })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/bots/${bot.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) { onSave(data); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Bot size={16} /> Identidad del BOT
        </h3>

        <div className="flex gap-4 mb-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Color</p>
            <div className="flex gap-1.5 flex-wrap w-[88px]">
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => set('avatar_color', c)}
                  style={{ backgroundColor: c }}
                  className={cn('w-7 h-7 rounded-lg transition-all', form.avatar_color === c && 'ring-2 ring-offset-1 ring-gray-400 scale-110')}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Nombre</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Descripción</label>
              <input value={form.description} onChange={e => set('description', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Modo</label>
            <select value={form.mode} onChange={e => set('mode', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white">
              {['general','sales','technical','agronomo'].map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Idioma</label>
            <select value={form.language} onChange={e => set('language', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white">
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Activo</label>
          <button
            onClick={() => set('is_active', !form.is_active)}
            className={cn('relative w-12 h-6 rounded-full transition-colors', form.is_active ? 'bg-green-400' : 'bg-gray-200')}
          >
            <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', form.is_active ? 'left-7' : 'left-1')} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Zap size={16} /> Modelo IA
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Proveedor</label>
            <select value={form.provider}
              onChange={e => { set('provider', e.target.value); set('model', PROVIDER_MODELS[e.target.value][0]) }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white">
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Modelo</label>
            <select value={form.model} onChange={e => set('model', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white">
              {(PROVIDER_MODELS[form.provider] ?? []).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">API Key ({form.provider})</label>
            <div className="relative">
              <input type={showKeys.api ? 'text' : 'password'} value={form.api_key}
                onChange={e => set('api_key', e.target.value)}
                placeholder="sk-..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30" />
              <button onClick={() => setShowKeys(s => ({ ...s, api: !s.api }))}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showKeys.api ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {form.provider !== 'openai' && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">OpenAI Key (para embeddings/RAG)</label>
              <div className="relative">
                <input type={showKeys.emb ? 'text' : 'password'} value={form.embedding_key}
                  onChange={e => set('embedding_key', e.target.value)}
                  placeholder="sk-... (opcional)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30" />
                <button onClick={() => setShowKeys(s => ({ ...s, emb: !s.emb }))}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showKeys.emb ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Temperatura: {form.temperature}</label>
            <input type="range" min="0" max="1" step="0.05"
              value={form.temperature} onChange={e => set('temperature', parseFloat(e.target.value))}
              className="w-full accent-brand" />
            <div className="flex justify-between text-[10px] text-gray-400"><span>Preciso</span><span>Creativo</span></div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Tokens máximos</label>
            <input type="number" min="256" max="8192" step="256"
              value={form.max_tokens} onChange={e => set('max_tokens', parseInt(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Settings2 size={16} /> Personalidad & Prompt
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Personalidad</label>
            <textarea value={form.personality} onChange={e => set('personality', e.target.value)}
              rows={2} placeholder="Describe el tono y estilo del bot..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">System Prompt adicional</label>
            <textarea value={form.system_prompt} onChange={e => set('system_prompt', e.target.value)}
              rows={5} placeholder="Instrucciones adicionales para el bot. El modo base ya incluye el comportamiento estándar..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none font-mono text-xs" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ── Tab: Documents ────────────────────────────────────────────────────────────

function DocumentsTab({ botId }: { botId: string }) {
  const [docs, setDocs] = useState<BotDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [embedding, setEmbedding] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'text' | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [textInput, setTextInput] = useState({ name: '', content: '' })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadDocs = () => {
    setLoading(true)
    fetch(`/api/bots/${botId}/documents`)
      .then(r => r.json())
      .then(d => { setDocs(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(loadDocs, [botId])

  async function uploadUrl() {
    if (!urlInput.trim()) return
    setUploading(true); setError('')
    try {
      const res = await fetch(`/api/bots/${botId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'url', name: urlInput, url: urlInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDocs(d => [data, ...d])
      setUrlInput(''); setUploadMode(null)
    } catch (e) { setError(String(e)) }
    finally { setUploading(false) }
  }

  async function uploadText() {
    if (!textInput.name.trim() || !textInput.content.trim()) return
    setUploading(true); setError('')
    try {
      const res = await fetch(`/api/bots/${botId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', name: textInput.name, content: textInput.content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDocs(d => [data, ...d])
      setTextInput({ name: '', content: '' }); setUploadMode(null)
    } catch (e) { setError(String(e)) }
    finally { setUploading(false) }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/bots/${botId}/documents`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDocs(d => [data, ...d])
      setUploadMode(null)
    } catch (e) { setError(String(e)) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function embedDoc(docId: string) {
    setEmbedding(docId)
    setDocs(d => d.map(x => x.id === docId ? { ...x, status: 'processing' } : x))
    const res = await fetch(`/api/bots/${botId}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: docId }),
    })
    const data = await res.json()
    if (res.ok) {
      setDocs(d => d.map(x => x.id === docId ? { ...x, status: 'ready', chunk_count: data.chunks } : x))
    } else {
      setDocs(d => d.map(x => x.id === docId ? { ...x, status: 'error', error_message: data.error } : x))
    }
    setEmbedding(null)
  }

  async function deleteDoc(docId: string) {
    if (!confirm('¿Eliminar este documento?')) return
    await fetch(`/api/bots/${botId}/documents/${docId}`, { method: 'DELETE' })
    setDocs(d => d.filter(x => x.id !== docId))
  }

  const docTypeIcon: Record<string, React.ElementType> = {
    pdf: FileType, docx: FileText, txt: FileText, url: Globe,
    text: Type, xlsx: FileText,
  }

  return (
    <div className="space-y-4">
      {/* Upload actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={16} /> Base de conocimiento
          </h3>
          <div className="flex gap-2">
            {[
              { key: 'file', icon: Upload, label: 'Archivo' },
              { key: 'url',  icon: Globe,  label: 'URL' },
              { key: 'text', icon: Type,   label: 'Texto' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key}
                onClick={() => setUploadMode(uploadMode === key ? null : key as 'file'|'url'|'text')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                  uploadMode === key ? 'bg-brand text-white border-brand' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload forms */}
        {uploadMode === 'file' && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-brand/40 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}>
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">Haz clic para seleccionar archivo</p>
            <p className="text-xs text-gray-400 mt-1">PDF, TXT · máx. 10 MB</p>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={uploadFile} />
            {uploading && <Loader2 size={16} className="mx-auto mt-2 animate-spin text-brand" />}
          </div>
        )}

        {uploadMode === 'url' && (
          <div className="space-y-2">
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com/page"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            <div className="flex gap-2">
              <button onClick={() => setUploadMode(null)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">Cancelar</button>
              <button onClick={uploadUrl} disabled={uploading || !urlInput.trim()}
                className="flex-1 px-3 py-1.5 bg-brand text-white text-sm rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Importar URL
              </button>
            </div>
          </div>
        )}

        {uploadMode === 'text' && (
          <div className="space-y-2">
            <input value={textInput.name} onChange={e => setTextInput(t => ({ ...t, name: e.target.value }))}
              placeholder="Nombre del documento (ej: FAQ Productos)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            <textarea value={textInput.content} onChange={e => setTextInput(t => ({ ...t, content: e.target.value }))}
              rows={6} placeholder="Pega aquí el texto del documento, información de productos, FAQ, etc."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none font-mono" />
            <div className="flex gap-2">
              <button onClick={() => setUploadMode(null)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">Cancelar</button>
              <button onClick={uploadText} disabled={uploading || !textInput.name.trim() || !textInput.content.trim()}
                className="flex-1 px-3 py-1.5 bg-brand text-white text-sm rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Agregar texto
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm mt-3">
            <AlertCircle size={13} /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X size={12} /></button>
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={18} className="animate-spin text-gray-300" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Sin documentos. Agrega contenido para entrenar el BOT.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Documento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Chunks</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tamaño</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => {
                const status = DOC_STATUS_META[doc.status] ?? DOC_STATUS_META.pending
                const StatusIcon = status.icon
                const DocIcon = docTypeIcon[doc.type] ?? FileText
                return (
                  <tr key={doc.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DocIcon size={14} className="text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{doc.name}</p>
                          {doc.error_message && (
                            <p className="text-[11px] text-red-500 truncate max-w-[200px]">{doc.error_message}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{doc.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full', status.color)}>
                        <StatusIcon size={10} className={doc.status === 'processing' ? 'animate-spin' : ''} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{doc.chunk_count || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{formatSize(doc.file_size)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {doc.status !== 'ready' && (
                          <button
                            onClick={() => embedDoc(doc.id)}
                            disabled={embedding === doc.id}
                            title="Procesar e indexar"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-500 disabled:opacity-50 transition-colors"
                          >
                            {embedding === doc.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <RefreshCw size={13} />
                            }
                          </button>
                        )}
                        {doc.status === 'ready' && (
                          <button
                            onClick={() => embedDoc(doc.id)}
                            disabled={embedding === doc.id}
                            title="Re-indexar"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-50 transition-colors"
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteDoc(doc.id)}
                          title="Eliminar"
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        <strong>Flujo de entrenamiento:</strong> Agrega documentos → Haz clic en <RefreshCw size={11} className="inline" /> para procesar e indexar → El BOT podrá buscar respuestas en ese contenido automáticamente.
      </div>
    </div>
  )
}

// ── Tab: Analytics ────────────────────────────────────────────────────────────

function AnalyticsTab({ bot }: { bot: BotConfig }) {
  const stats = [
    { label: 'Conversaciones',   value: bot.total_conversations, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
    { label: 'Mensajes totales', value: bot.total_messages,      icon: Zap,           color: 'text-purple-600 bg-purple-50' },
    { label: 'Tokens usados',    value: `${(bot.total_tokens/1000).toFixed(1)}K`, icon: BarChart3, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Información del modelo</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Proveedor', bot.provider],
            ['Modelo', bot.model],
            ['Temperatura', bot.temperature],
            ['Max tokens', bot.max_tokens],
            ['Idioma', bot.language],
            ['Modo', bot.mode],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-900 font-mono text-xs">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BotAdminPage() {
  const params = useParams<{ id: string }>()
  const botId = params.id
  const [bot, setBot] = useState<BotConfig | null>(null)
  const [tab, setTab] = useState<'config' | 'documents' | 'analytics'>('config')

  useEffect(() => {
    fetch(`/api/bots/${botId}`)
      .then(r => r.json())
      .then(d => { if (d && !d.error) setBot(d) })
      .catch(() => {})
  }, [botId])

  if (!bot) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  )

  const tabs = [
    { key: 'config',    icon: Settings2, label: 'Configuración' },
    { key: 'documents', icon: FileText,  label: 'Documentos' },
    { key: 'analytics', icon: BarChart3, label: 'Analíticas' },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/bot-ia/${botId}`}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <ChevronLeft size={18} />
            </Link>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: bot.avatar_color + '20' }}>
              <Bot size={17} style={{ color: bot.avatar_color }} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">{bot.name}</h1>
              <p className="text-xs text-gray-400">Panel de administración</p>
            </div>
          </div>
          <Link href={`/bot-ia/${botId}`}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90 transition-colors">
            <MessageSquare size={14} /> Abrir Chat
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6">
        <div className="flex gap-0.5">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                tab === key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              )}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        {tab === 'config'    && <ConfigTab    bot={bot} onSave={setBot} />}
        {tab === 'documents' && <DocumentsTab botId={botId} />}
        {tab === 'analytics' && <AnalyticsTab bot={bot} />}
      </main>
    </div>
  )
}
