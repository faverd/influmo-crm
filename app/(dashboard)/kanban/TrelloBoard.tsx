'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, X, MoreHorizontal, Trash2, Image as ImageIcon, Loader2, Check,
  AlignLeft, Tag, Palette, GripVertical, Pencil, Calendar, Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Card {
  id: string
  title: string
  description?: string
  labels?: string[]      // hex colors
  image?: string         // cover image URL
  due?: string           // ISO date
}
interface Column { id: string; title: string; cards: Card[] }
interface Board { columns: Column[]; background: string }

const LABEL_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7', '#3b82f6', '#06b6d4', '#ec4899']

const BACKGROUNDS = [
  { id: 'green', label: 'Verde', value: 'linear-gradient(135deg,#16a34a,#15803d)' },
  { id: 'blue', label: 'Azul', value: 'linear-gradient(135deg,#2563eb,#1e40af)' },
  { id: 'purple', label: 'Púrpura', value: 'linear-gradient(135deg,#7c3aed,#5b21b6)' },
  { id: 'orange', label: 'Naranja', value: 'linear-gradient(135deg,#ea580c,#c2410c)' },
  { id: 'teal', label: 'Turquesa', value: 'linear-gradient(135deg,#0d9488,#0f766e)' },
  { id: 'slate', label: 'Gris', value: 'linear-gradient(135deg,#475569,#1e293b)' },
  { id: 'sky', label: 'Cielo', value: 'linear-gradient(135deg,#0ea5e9,#0284c7)' },
  { id: 'rose', label: 'Rosa', value: 'linear-gradient(135deg,#e11d48,#be123c)' },
  { id: 'sunset', label: 'Atardecer', value: 'linear-gradient(135deg,#f59e0b,#db2777,#7c3aed)' },
  { id: 'forest', label: 'Bosque', value: 'linear-gradient(135deg,#065f46,#16a34a,#84cc16)' },
  { id: 'ocean', label: 'Océano', value: 'linear-gradient(135deg,#0c4a6e,#0ea5e9,#22d3ee)' },
  { id: 'night', label: 'Noche', value: 'linear-gradient(135deg,#0f172a,#1e293b,#334155)' },
]

const uid = () => Math.random().toString(36).slice(2, 10)

const DEFAULT_BOARD: Board = {
  background: BACKGROUNDS[0].value,
  columns: [
    { id: uid(), title: 'Por hacer', cards: [{ id: uid(), title: 'Bienvenido a tu tablero 👋', description: 'Arrastra esta tarjeta a otra columna.' }] },
    { id: uid(), title: 'En progreso', cards: [] },
    { id: uid(), title: 'En revisión', cards: [] },
    { id: uid(), title: 'Completado', cards: [] },
  ],
}

export default function TrelloBoard() {
  const [board, setBoard] = useState<Board>(DEFAULT_BOARD)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editCard, setEditCard] = useState<{ colId: string; card: Card } | null>(null)
  const [showBg, setShowBg] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bgFileRef = useRef<HTMLInputElement>(null)

  // Drag state
  const dragItem = useRef<{ colId: string; cardId: string } | null>(null)

  async function uploadBg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingBg(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/trello/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok) { update(b => ({ ...b, background: d.url })); setShowBg(false) }
    } finally { setUploadingBg(false); if (bgFileRef.current) bgFileRef.current.value = '' }
  }

  // ── Load ──
  useEffect(() => {
    fetch('/api/trello').then(r => r.json()).then((d: Board) => {
      if (d && Array.isArray(d.columns) && d.columns.length) setBoard(d)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  // ── Auto-save (debounced) ──
  const persist = useCallback((b: Board) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await fetch('/api/trello', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).catch(() => {})
      setSaving(false)
    }, 700)
  }, [])

  const update = useCallback((updater: (b: Board) => Board) => {
    setBoard(prev => { const next = updater(prev); persist(next); return next })
  }, [persist])

  // ── Column ops ──
  function addColumn() {
    update(b => ({ ...b, columns: [...b.columns, { id: uid(), title: 'Nueva lista', cards: [] }] }))
  }
  function renameColumn(colId: string, title: string) {
    update(b => ({ ...b, columns: b.columns.map(c => c.id === colId ? { ...c, title } : c) }))
  }
  function deleteColumn(colId: string) {
    if (!confirm('¿Eliminar esta lista y todas sus tarjetas?')) return
    update(b => ({ ...b, columns: b.columns.filter(c => c.id !== colId) }))
  }

  // ── Card ops ──
  function addCard(colId: string, title: string) {
    if (!title.trim()) return
    update(b => ({ ...b, columns: b.columns.map(c => c.id === colId ? { ...c, cards: [...c.cards, { id: uid(), title: title.trim() }] } : c) }))
  }
  function saveCard(colId: string, card: Card) {
    update(b => ({ ...b, columns: b.columns.map(c => c.id === colId ? { ...c, cards: c.cards.map(k => k.id === card.id ? card : k) } : c) }))
  }
  function deleteCard(colId: string, cardId: string) {
    update(b => ({ ...b, columns: b.columns.map(c => c.id === colId ? { ...c, cards: c.cards.filter(k => k.id !== cardId) } : c) }))
  }

  // ── Drag & drop ──
  function onDragStart(colId: string, cardId: string) { dragItem.current = { colId, cardId } }
  function onDropCard(targetColId: string, targetIndex: number) {
    const drag = dragItem.current
    if (!drag) return
    update(b => {
      const cols = b.columns.map(c => ({ ...c, cards: [...c.cards] }))
      const from = cols.find(c => c.id === drag.colId)!
      const idx = from.cards.findIndex(k => k.id === drag.cardId)
      if (idx === -1) return b
      const [card] = from.cards.splice(idx, 1)
      const to = cols.find(c => c.id === targetColId)!
      const insertAt = targetIndex < 0 ? to.cards.length : targetIndex
      to.cards.splice(insertAt, 0, card)
      return { ...b, columns: cols }
    })
    dragItem.current = null
  }

  if (!loaded) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-cover bg-center"
      style={board.background.startsWith('http')
        ? { backgroundImage: `url(${board.background})` }
        : { background: board.background }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black/15 backdrop-blur shrink-0">
        <h1 className="text-white font-bold text-lg drop-shadow">Tablero</h1>
        <span className="text-white/70 text-xs flex items-center gap-1">
          {saving ? <><Loader2 size={11} className="animate-spin" /> Guardando...</> : <><Check size={11} /> Guardado</>}
        </span>
        <div className="ml-auto flex items-center gap-2 relative">
          <button onClick={() => setShowBg(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium backdrop-blur">
            <Palette size={13} /> Fondo
          </button>
          {showBg && (
            <div className="absolute top-10 right-0 bg-white rounded-xl shadow-xl p-3 z-30 w-64">
              <p className="text-xs font-semibold text-gray-500 mb-2">Degradados</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {BACKGROUNDS.map(bg => (
                  <button key={bg.id} onClick={() => { update(b => ({ ...b, background: bg.value })); setShowBg(false) }}
                    style={{ background: bg.value }}
                    className={cn('h-11 rounded-lg transition-transform hover:scale-105', board.background === bg.value && 'ring-2 ring-offset-2 ring-gray-400')}
                    title={bg.label} />
                ))}
              </div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Imagen de fondo</p>
              <button onClick={() => bgFileRef.current?.click()} disabled={uploadingBg}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                {uploadingBg ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} Subir imagen
              </button>
              <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={uploadBg} />
              {board.background.startsWith('http') && (
                <button onClick={() => { update(b => ({ ...b, background: BACKGROUNDS[0].value })); setShowBg(false) }}
                  className="w-full mt-2 text-xs text-red-500 hover:underline">Quitar imagen de fondo</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-3 h-full items-start">
          {board.columns.map(col => (
            <ColumnView key={col.id} col={col}
              onRename={renameColumn} onDelete={deleteColumn}
              onAddCard={addCard} onOpenCard={(card) => setEditCard({ colId: col.id, card })}
              onDragStart={onDragStart} onDropCard={onDropCard} />
          ))}
          {/* Add column */}
          <button onClick={addColumn}
            className="w-72 shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium backdrop-blur">
            <Plus size={16} /> Añadir otra lista
          </button>
        </div>
      </div>

      {/* Card editor modal */}
      {editCard && (
        <CardEditor
          card={editCard.card}
          onClose={() => setEditCard(null)}
          onSave={(c) => { saveCard(editCard.colId, c); setEditCard(null) }}
          onDelete={() => { deleteCard(editCard.colId, editCard.card.id); setEditCard(null) }}
        />
      )}
    </div>
  )
}

// ── Column ─────────────────────────────────────────────────────────────────────

function ColumnView({ col, onRename, onDelete, onAddCard, onOpenCard, onDragStart, onDropCard }: {
  col: Column
  onRename: (id: string, t: string) => void
  onDelete: (id: string) => void
  onAddCard: (id: string, t: string) => void
  onOpenCard: (card: Card) => void
  onDragStart: (colId: string, cardId: string) => void
  onDropCard: (colId: string, index: number) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(col.title)
  const [menu, setMenu] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => setTitle(col.title), [col.title])

  return (
    <div className="w-72 shrink-0 bg-gray-100 rounded-xl flex flex-col max-h-full"
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDropCard(col.id, -1) }}>
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2.5">
        {editingTitle ? (
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
            onBlur={() => { onRename(col.id, title); setEditingTitle(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { onRename(col.id, title); setEditingTitle(false) } }}
            className="flex-1 text-sm font-semibold bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand/30" />
        ) : (
          <h3 onClick={() => setEditingTitle(true)} className="flex-1 text-sm font-semibold text-gray-700 px-1 cursor-pointer truncate">
            {col.title} <span className="text-gray-400 font-normal">{col.cards.length}</span>
          </h3>
        )}
        <div className="relative">
          <button onClick={() => setMenu(m => !m)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500">
            <MoreHorizontal size={15} />
          </button>
          {menu && (
            <div className="absolute right-0 top-7 bg-white rounded-lg shadow-lg z-20 py-1 min-w-[130px]">
              <button onClick={() => { setEditingTitle(true); setMenu(false) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"><Pencil size={12} /> Renombrar</button>
              <button onClick={() => { onDelete(col.id); setMenu(false) }} className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Eliminar lista</button>
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className={cn('flex-1 overflow-y-auto px-2 pb-1 space-y-2 min-h-[8px]', dragOver && 'bg-brand/5 rounded-lg')}>
        {col.cards.map((card, i) => (
          <div key={card.id}
            draggable
            onDragStart={() => onDragStart(col.id, card.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.stopPropagation(); onDropCard(col.id, i) }}
            onClick={() => onOpenCard(card)}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group">
            {card.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.image} alt="" className="w-full h-28 object-cover" />
            )}
            <div className="p-2.5">
              {card.labels && card.labels.length > 0 && (
                <div className="flex gap-1 mb-1.5 flex-wrap">
                  {card.labels.map((c, j) => <span key={j} className="h-2 w-9 rounded-full" style={{ backgroundColor: c }} />)}
                </div>
              )}
              <p className="text-sm text-gray-800 leading-snug">{card.title}</p>
              <div className="flex items-center gap-2 mt-1.5 text-gray-400">
                {card.description && <AlignLeft size={12} />}
                {card.due && <span className="text-[10px] flex items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded"><Calendar size={9} />{new Date(card.due).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add card */}
      <div className="p-2">
        {adding ? (
          <div>
            <textarea autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAddCard(col.id, newTitle); setNewTitle('') } }}
              placeholder="Título de la tarjeta..." rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand/30" />
            <div className="flex gap-2 mt-1">
              <button onClick={() => { onAddCard(col.id, newTitle); setNewTitle('') }}
                className="px-3 py-1.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90">Añadir</button>
              <button onClick={() => { setAdding(false); setNewTitle('') }} className="px-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="w-full text-left px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-200 rounded-lg flex items-center gap-1.5">
            <Plus size={14} /> Añadir tarjeta
          </button>
        )}
      </div>
    </div>
  )
}

// ── Card editor ─────────────────────────────────────────────────────────────────

function CardEditor({ card, onClose, onSave, onDelete }: {
  card: Card; onClose: () => void; onSave: (c: Card) => void; onDelete: () => void
}) {
  const [form, setForm] = useState<Card>({ ...card, labels: card.labels ?? [] })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: keyof Card, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  function toggleLabel(color: string) {
    setForm(f => {
      const labels = f.labels ?? []
      return { ...f, labels: labels.includes(color) ? labels.filter(c => c !== color) : [...labels, color] }
    })
  }

  async function uploadImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/trello/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok) set('image', d.url)
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Cover */}
        {form.image && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.image} alt="" className="w-full h-40 object-cover rounded-t-2xl" />
            <button onClick={() => set('image', undefined)} className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"><X size={14} /></button>
          </div>
        )}

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="flex-1 text-lg font-semibold text-gray-900 border-0 border-b-2 border-transparent focus:border-brand focus:outline-none" />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          {/* Labels */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Tag size={12} /> Etiquetas</p>
            <div className="flex gap-2 flex-wrap">
              {LABEL_COLORS.map(c => (
                <button key={c} onClick={() => toggleLabel(c)} style={{ backgroundColor: c }}
                  className={cn('w-10 h-7 rounded-lg transition-all', (form.labels ?? []).includes(c) ? 'ring-2 ring-offset-1 ring-gray-400' : 'opacity-60 hover:opacity-100')}>
                  {(form.labels ?? []).includes(c) && <Check size={13} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><AlignLeft size={12} /> Descripción</p>
            <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={4}
              placeholder="Añade más detalles..."
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 bg-gray-50" />
          </div>

          {/* Due + image */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Calendar size={12} /> Fecha</p>
              <input type="date" value={form.due ?? ''} onChange={e => set('due', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><ImageIcon size={12} /> Imagen</p>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 flex items-center justify-center gap-1.5 text-gray-600">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} Subir
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadImg} />
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onDelete} className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 flex items-center gap-1.5"><Trash2 size={14} /> Eliminar</button>
          <button onClick={() => onSave(form)} className="px-5 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand/90 flex items-center gap-1.5"><Check size={15} /> Guardar</button>
        </div>
      </div>
    </div>
  )
}
