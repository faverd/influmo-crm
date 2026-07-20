'use client'
import { useState, useEffect } from 'react'
import { Plus, TrendingDown, Search, Tag } from 'lucide-react'

type Gasto = { id: string; descripcion: string; categoria: string; monto: number; moneda: string; proveedor: string; fecha: string; notas: string }

const CATEGORIAS = ['materiales','mano de obra','transporte','herramientas','marketing','oficina','servicios','otros']
const COLORES: Record<string, string> = {
  materiales: 'bg-blue-100 text-blue-700', 'mano de obra': 'bg-purple-100 text-purple-700',
  transporte: 'bg-orange-100 text-orange-700', herramientas: 'bg-yellow-100 text-yellow-700',
  marketing: 'bg-pink-100 text-pink-700', oficina: 'bg-gray-100 text-gray-600',
  servicios: 'bg-teal-100 text-teal-700', otros: 'bg-slate-100 text-slate-600',
}

export default function GastosPage() {
  const [list, setList] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ descripcion: '', categoria: 'materiales', monto: '', moneda: 'PEN', proveedor: '', fecha: new Date().toISOString().split('T')[0], notas: '' })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const r = await fetch('/api/gastos')
    if (r.ok) setList(await r.json())
    setLoading(false)
  }

  async function save() {
    if (!form.descripcion.trim() || !form.monto) return alert('Completa los campos requeridos')
    setSaving(true)
    const r = await fetch('/api/gastos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, monto: parseFloat(form.monto) }) })
    if (r.ok) { setModal(false); load(); setForm({ descripcion: '', categoria: 'materiales', monto: '', moneda: 'PEN', proveedor: '', fecha: new Date().toISOString().split('T')[0], notas: '' }) }
    setSaving(false)
  }

  const filtered = list.filter(g =>
    (g.descripcion.toLowerCase().includes(search.toLowerCase()) || g.proveedor?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterCat || g.categoria === filterCat)
  )

  const totalMes = list.filter(g => g.fecha?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, g) => s + g.monto, 0)
  const totalGeneral = list.reduce((s, g) => s + g.monto, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de egresos y costos</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Registrar Gasto
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total registros', value: list.length },
          { label: 'Este mes', value: `S/ ${totalMes.toFixed(2)}` },
          { label: 'Total gastos', value: `S/ ${totalGeneral.toFixed(2)}` },
          { label: 'Categorías', value: [...new Set(list.map(g => g.categoria))].length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar gasto..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Cargando...</div> :
          filtered.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingDown size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No hay gastos registrados</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Descripción','Categoría','Proveedor','Fecha','Monto'].map(h =>
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{g.descripcion}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${COLORES[g.categoria] ?? 'bg-gray-100 text-gray-600'}`}>{g.categoria}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{g.proveedor || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{g.fecha}</td>
                    <td className="px-4 py-3 font-bold text-red-600">S/ {g.monto?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between">
              <h2 className="text-lg font-bold">Registrar Gasto</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Descripción *</label>
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Tela para cortinas proyecto Lima"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Categoría</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Monto *</label>
                  <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Proveedor</label>
                  <input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
