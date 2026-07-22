'use client'

import { useEffect, useState } from 'react'
import { MapPin, Plus, X, Check, Trash2, Search, Warehouse } from 'lucide-react'

interface Ubicacion {
  id: string; codigo: string; almacen: string | null; pasillo: string | null
  estante: string | null; nivel: string | null; posicion: string | null
  capacidad: number; ocupacion: number
}

const emptyForm = { codigo: '', almacen: 'Almacén Central', pasillo: '', estante: '', nivel: '', posicion: '', capacidad: '', ocupacion: '' }

export default function UbicacionesAlmacenPage() {
  const [list, setList] = useState<Ubicacion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const r = await fetch('/api/almacen/ubicaciones')
    if (r.ok) setList(await r.json())
    setLoading(false)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.codigo.trim()) return
    await fetch('/api/almacen/ubicaciones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, capacidad: parseInt(form.capacidad) || 0, ocupacion: parseInt(form.ocupacion) || 0 }),
    })
    setForm(emptyForm)
    setShowModal(false)
    load()
  }

  async function del(id: string) {
    await fetch(`/api/almacen/ubicaciones/${id}`, { method: 'DELETE' })
    setList(l => l.filter(x => x.id !== id))
  }

  const filtered = list.filter(u => u.codigo.toLowerCase().includes(search.toLowerCase()))
  const almacenes = new Set(list.map(u => u.almacen).filter(Boolean)).size
  const pasillos = new Set(list.map(u => u.pasillo).filter(Boolean)).size

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Ubicaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Mapa del almacén: pasillos, estantes, niveles y posiciones</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition">
          <Plus size={16} /> <span className="hidden sm:inline">Nueva ubicación</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-5">
        {[{ label: 'Ubicaciones', value: list.length }, { label: 'Almacenes', value: almacenes }, { label: 'Pasillos', value: pasillos }].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center"><MapPin size={16} className="text-brand" /></div>
            <div><p className="text-xl font-bold text-gray-900">{c.value}</p><p className="text-xs text-gray-400">{c.label}</p></div>
          </div>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ubicación, código..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Warehouse size={30} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Sin ubicaciones. Crea la primera.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(u => {
              const pct = u.capacidad > 0 ? Math.min(100, Math.round((u.ocupacion / u.capacidad) * 100)) : 0
              return (
                <div key={u.id} className="border border-gray-100 rounded-xl p-3 group hover:shadow-sm transition">
                  <div className="flex items-start justify-between mb-1.5">
                    <p className="font-mono font-bold text-sm text-gray-900">{u.codigo}</p>
                    <button onClick={() => del(u.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition"><Trash2 size={12} /></button>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    {[u.almacen, u.pasillo && `Pasillo ${u.pasillo}`, u.estante && `Estante ${u.estante}`, u.nivel && `Nivel ${u.nivel}`].filter(Boolean).join(' · ')}
                  </p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className={`h-full rounded-full ${pct > 85 ? 'bg-red-400' : pct > 60 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400">{u.ocupacion}/{u.capacidad} ocupado ({pct}%)</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={create} className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Nueva ubicación</p>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Código *</label>
                <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} required
                  placeholder="Ej: A-01-03"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Almacén</label>
                <input value={form.almacen} onChange={e => setForm(f => ({ ...f, almacen: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Pasillo</label>
                  <input value={form.pasillo} onChange={e => setForm(f => ({ ...f, pasillo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Estante</label>
                  <input value={form.estante} onChange={e => setForm(f => ({ ...f, estante: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nivel</label>
                  <input value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Capacidad</label>
                  <input type="number" value={form.capacidad} onChange={e => setForm(f => ({ ...f, capacidad: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Ocupación actual</label>
                  <input type="number" value={form.ocupacion} onChange={e => setForm(f => ({ ...f, ocupacion: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button type="submit" className="flex items-center gap-1.5 px-5 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:opacity-90 transition">
                <Check size={14} /> Crear
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
