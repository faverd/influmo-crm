'use client'

import { useEffect, useState } from 'react'
import { Plus, TrendingUp, TrendingDown, X, Check, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Mov {
  id: string; tipo: 'entrada'|'salida'; producto: string; cantidad: number
  unidad: string | null; motivo: string | null; responsable: string | null; created_at: string
}

const emptyForm = { tipo: 'entrada' as 'entrada'|'salida', producto: '', cantidad: '', unidad: 'unidad', motivo: '', responsable: '' }

export default function MovimientosPage() {
  const [movs, setMovs] = useState<Mov[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState<'todos'|'entrada'|'salida'>('todos')

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const r = await fetch('/api/almacen/movimientos')
    if (r.ok) setMovs(await r.json())
    setLoading(false)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.producto.trim() || !form.cantidad) return
    await fetch('/api/almacen/movimientos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, cantidad: parseFloat(form.cantidad) || 0 }),
    })
    setForm(emptyForm)
    setShowModal(false)
    load()
  }

  const filtered = filter === 'todos' ? movs : movs.filter(m => m.tipo === filter)
  const entradas = movs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.cantidad, 0)
  const salidas = movs.filter(m => m.tipo === 'salida').reduce((s, m) => s + m.cantidad, 0)

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ArrowLeftRight size={22} className="text-brand" />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Entradas / Salidas</h1>
            <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Movimientos de materiales de decoración en almacén</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition">
          <Plus size={16} /> <span className="hidden sm:inline">Nuevo movimiento</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center"><TrendingUp size={16} className="text-green-600" /></div>
          <div><p className="text-lg font-bold text-green-700">{entradas}</p><p className="text-xs text-green-600">Total entradas</p></div>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center"><TrendingDown size={16} className="text-red-600" /></div>
          <div><p className="text-lg font-bold text-red-700">{salidas}</p><p className="text-xs text-red-600">Total salidas</p></div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[{ key: 'todos', label: 'Todos' }, { key: 'entrada', label: 'Entradas' }, { key: 'salida', label: 'Salidas' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition',
              filter === f.key ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">Sin movimientos aún</div>
        ) : filtered.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-4">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              m.tipo === 'entrada' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}>
              {m.tipo === 'entrada' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{m.producto}</p>
              <p className="text-xs text-gray-400">
                {m.motivo && `${m.motivo} · `}{m.responsable && `${m.responsable} · `}
                {new Date(m.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <span className={cn('text-sm font-bold', m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600')}>
              {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad} {m.unidad}
            </span>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={create} className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Nuevo movimiento</p>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex gap-2">
                {(['entrada', 'salida'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-semibold border transition',
                      form.tipo === t
                        ? (t === 'entrada' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700')
                        : 'border-gray-200 text-gray-500')}>
                    {t === 'entrada' ? '↑ Entrada' : '↓ Salida'}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Producto *</label>
                <input value={form.producto} onChange={e => setForm(f => ({ ...f, producto: e.target.value }))} required
                  placeholder="Ej: Tela blackout premium"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Cantidad *</label>
                  <input type="number" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Unidad</label>
                  <select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
                    {['unidad','m²','ml','metro','rollo','caja','litro','kg'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Motivo</label>
                <input value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                  placeholder="Ej: Compra a proveedor / Instalación proyecto"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Responsable</label>
                <input value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button type="submit" className="flex items-center gap-1.5 px-5 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:opacity-90 transition">
                <Check size={14} /> Registrar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
