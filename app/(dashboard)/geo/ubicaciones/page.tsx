'use client'

import { useEffect, useState } from 'react'
import { Store, Plus, X, Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Ubicacion {
  id: string; nombre: string; tipo: string; cliente: string | null
  direccion: string | null; ciudad: string | null; estado: string
}

const TIPOS = ['showroom', 'taller', 'tienda', 'punto de venta', 'oficina']
const emptyForm = { nombre: '', tipo: 'showroom', cliente: '', direccion: '', ciudad: '', estado: 'activo' }

export default function UbicacionesComercialesPage() {
  const [list, setList] = useState<Ubicacion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const r = await fetch('/api/geo/ubicaciones')
    if (r.ok) setList(await r.json())
    setLoading(false)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    await fetch('/api/geo/ubicaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm(emptyForm)
    setShowModal(false)
    load()
  }

  async function del(id: string) {
    await fetch(`/api/geo/ubicaciones/${id}`, { method: 'DELETE' })
    setList(l => l.filter(x => x.id !== id))
  }

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Store size={22} className="text-brand" />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Ubicaciones Comerciales</h1>
            <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Showrooms, talleres y puntos de venta geolocalizados</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition">
          <Plus size={16} /> <span className="hidden sm:inline">Nueva ubicación</span>
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden mb-4 border border-gray-100">
        <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-77.2,-12.2,-76.8,-11.8&layer=mapnik"
          width="100%" height="280" style={{ border: 0 }} title="Mapa ubicaciones" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <Store size={30} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Sin ubicaciones registradas</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-400 uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold">Ubicación</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-4 py-3 font-semibold text-gray-900">{u.nombre}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize flex items-center gap-1.5">🏬 {u.tipo}</td>
                  <td className="px-4 py-3 text-gray-500">{u.cliente || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{[u.direccion, u.ciudad].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      u.estado === 'activo' ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100')}>
                      {u.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(u.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={create} className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Nueva ubicación comercial</p>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
                    {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente</label>
                  <input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Dirección</label>
                <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Ciudad / Distrito</label>
                <input value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
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
