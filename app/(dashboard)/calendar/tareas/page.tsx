'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Plus, X, Check, Trash2, MapPin, User, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ZONAS_LIMA } from '@/components/full-calendar'

interface Tarea {
  id: string; titulo: string; cliente: string | null; tecnico: string | null
  zona: string | null; fecha: string | null; estado: 'pendiente'|'en_progreso'|'completada'
  notas: string | null; created_at: string
}

const ESTADOS: { key: Tarea['estado']; label: string; color: string }[] = [
  { key: 'pendiente',   label: 'Pendiente',    color: '#f59e0b' },
  { key: 'en_progreso', label: 'En progreso',  color: '#3b82f6' },
  { key: 'completada',  label: 'Completada',   color: '#16a34a' },
]

const emptyForm = { titulo: '', cliente: '', tecnico: '', zona: '', fecha: '', notas: '' }

export default function TareasCampoPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.from('tareas_campo').select('*').order('fecha', { ascending: true, nullsFirst: false })
    setTareas(data ?? [])
    setLoading(false)
  }

  async function createTarea(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    const sb = createClient()
    await sb.from('tareas_campo').insert({
      titulo: form.titulo, cliente: form.cliente || null, tecnico: form.tecnico || null,
      zona: form.zona || null, fecha: form.fecha || null, notas: form.notas || null, estado: 'pendiente',
    })
    setForm(emptyForm)
    setShowModal(false)
    load()
  }

  async function updateEstado(id: string, estado: Tarea['estado']) {
    const sb = createClient()
    await sb.from('tareas_campo').update({ estado, updated_at: new Date().toISOString() }).eq('id', id)
    setTareas(ts => ts.map(t => t.id === id ? { ...t, estado } : t))
  }

  async function deleteTarea(id: string) {
    const sb = createClient()
    await sb.from('tareas_campo').delete().eq('id', id)
    setTareas(ts => ts.filter(t => t.id !== id))
  }

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList size={22} className="text-brand" />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Tareas de campo</h1>
            <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Medición, entrega e instalación en obra por técnico y zona</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition">
          <Plus size={16} /> <span className="hidden sm:inline">Nueva tarea</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ESTADOS.map(col => {
            const items = tareas.filter(t => t.estado === col.key)
            return (
              <div key={col.key} className="bg-gray-50/60 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: col.color }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: col.color }} /> {col.label}
                  </p>
                  <span className="text-xs font-semibold text-gray-400">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-8">Sin tareas</p>
                  ) : items.map(t => (
                    <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-3 group hover:shadow-sm transition">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-semibold text-gray-900 flex-1">{t.titulo}</p>
                        <button onClick={() => deleteTarea(t.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="space-y-1 mb-2.5">
                        {t.cliente && <p className="text-[11px] text-gray-500 flex items-center gap-1"><User size={10} /> {t.cliente}</p>}
                        {t.tecnico && <p className="text-[11px] text-gray-500 flex items-center gap-1">🛠️ {t.tecnico}</p>}
                        {t.zona && <p className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin size={10} /> {t.zona}</p>}
                        {t.fecha && <p className="text-[11px] text-gray-500 flex items-center gap-1"><CalendarIcon size={10} /> {new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</p>}
                        {t.notas && <p className="text-[11px] text-gray-400 italic mt-1">{t.notas}</p>}
                      </div>
                      <div className="flex gap-1">
                        {ESTADOS.filter(e => e.key !== t.estado).map(e => (
                          <button key={e.key} onClick={() => updateEstado(t.id, e.key)}
                            className="text-[10px] font-medium px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                            → {e.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New task modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={createTarea}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Nueva tarea de campo</p>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Tarea *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required
                  placeholder="Ej: Instalación de cortinas blackout"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente</label>
                  <input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Técnico</label>
                  <input value={form.tecnico} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Zona</label>
                  <select value={form.zona} onChange={e => setForm(f => ({ ...f, zona: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
                    <option value="">Sin zona</option>
                    {ZONAS_LIMA.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button type="submit" disabled={!form.titulo.trim()}
                className="flex items-center gap-1.5 px-5 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-40">
                <Check size={14} /> Crear tarea
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
