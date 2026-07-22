'use client'

import { useEffect, useState } from 'react'
import { StickyNote, Plus, Pin, PinOff, Trash2, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Nota {
  id: string; titulo: string; contenido: string; color: string
  pinned: boolean; created_at: string; updated_at: string
}

const PALETTE = [
  '#d1fae5', // green
  '#dbeafe', // blue
  '#fef9c3', // yellow
  '#ede9fe', // purple
  '#fce7f3', // pink
  '#ffffff', // white/gray
]

export default function NotasPage() {
  const [notas, setNotas] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitulo, setDraftTitulo] = useState('')
  const [draftContenido, setDraftContenido] = useState('')
  const [draftColor, setDraftColor] = useState(PALETTE[0])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.from('notas_rapidas').select('*')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    setNotas(data ?? [])
    setLoading(false)
  }

  async function createNota() {
    const sb = createClient()
    const { data } = await sb.from('notas_rapidas')
      .insert({ titulo: 'Nueva nota', contenido: '', color: PALETTE[0], pinned: false })
      .select().single()
    if (data) {
      setNotas(n => [data, ...n])
      openEdit(data)
    }
  }

  function openEdit(n: Nota) {
    setEditingId(n.id)
    setDraftTitulo(n.titulo)
    setDraftContenido(n.contenido)
    setDraftColor(n.color || PALETTE[0])
  }

  async function saveEdit() {
    if (!editingId) return
    const sb = createClient()
    await sb.from('notas_rapidas')
      .update({ titulo: draftTitulo, contenido: draftContenido, color: draftColor, updated_at: new Date().toISOString() })
      .eq('id', editingId)
    setEditingId(null)
    load()
  }

  async function togglePin(n: Nota) {
    const sb = createClient()
    await sb.from('notas_rapidas').update({ pinned: !n.pinned }).eq('id', n.id)
    setNotas(ns => ns.map(x => x.id === n.id ? { ...x, pinned: !x.pinned } : x))
    load()
  }

  async function deleteNota(id: string) {
    const sb = createClient()
    await sb.from('notas_rapidas').delete().eq('id', id)
    setNotas(n => n.filter(x => x.id !== id))
    if (editingId === id) setEditingId(null)
  }

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <StickyNote size={22} className="text-brand" />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Notas</h1>
            <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Apunta ideas de forma rápida y sencilla</p>
          </div>
        </div>
        <button onClick={createNota}
          className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition">
          <Plus size={16} /> <span className="hidden sm:inline">Nueva nota</span>
        </button>
      </div>

      {loading ? (
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse break-inside-avoid" />)}
        </div>
      ) : notas.length === 0 ? (
        <div className="text-center py-20">
          <StickyNote size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">Sin notas aún — crea la primera con &quot;+ Nueva nota&quot;</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 [column-fill:_balance]">
          {notas.map(n => (
            <div key={n.id}
              onClick={() => openEdit(n)}
              className="rounded-2xl p-4 mb-4 break-inside-avoid cursor-pointer border border-black/5 hover:shadow-md transition group relative"
              style={{ backgroundColor: n.color || '#ffffff' }}>
              <div className="flex items-start justify-between mb-1.5 gap-2">
                {n.titulo && <p className="font-bold text-gray-800 text-sm flex-1">{n.titulo}</p>}
                <button onClick={e => { e.stopPropagation(); togglePin(n) }}
                  className={cn('shrink-0 transition p-0.5 rounded',
                    n.pinned ? 'text-brand' : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-500')}>
                  {n.pinned ? <Pin size={14} className="fill-current" /> : <Pin size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                {n.contenido || <span className="text-gray-400 italic">Sin contenido…</span>}
              </p>
              <button onClick={e => { e.stopPropagation(); deleteNota(n.id) }}
                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1 rounded-lg hover:bg-black/5">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingId(null)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: draftColor }}>
            <div className="p-5">
              <input value={draftTitulo} onChange={e => setDraftTitulo(e.target.value)}
                placeholder="Título"
                className="w-full bg-transparent font-bold text-gray-800 text-base focus:outline-none placeholder:text-gray-400 mb-2" />
              <textarea value={draftContenido} onChange={e => setDraftContenido(e.target.value)}
                placeholder="Escribe tu nota..." rows={8} autoFocus
                className="w-full bg-transparent text-sm text-gray-700 focus:outline-none resize-none placeholder:text-gray-400" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-black/5">
              <div className="flex items-center gap-1.5">
                {PALETTE.map(c => (
                  <button key={c} onClick={() => setDraftColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn('w-6 h-6 rounded-full border-2 transition hover:scale-110',
                      draftColor === c ? 'border-brand scale-110' : 'border-white/60')} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => deleteNota(editingId)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-red-100 hover:text-red-600 transition"><Trash2 size={15} /></button>
                <button onClick={() => setEditingId(null)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-black/10 transition"><X size={15} /></button>
                <button onClick={saveEdit}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:opacity-90 transition">
                  <Check size={13} /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
