'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, Package, AlertTriangle, Edit2, Trash2 } from 'lucide-react'
import { alertDialog } from '@/lib/dialogs'

type Item = {
  id: string; codigo: string; nombre: string; descripcion: string
  categoria: string; unidad: string; stock_actual: number; stock_minimo: number
  precio_costo: number; precio_venta: number; proveedor: string; activo: boolean
}

const CATEGORIAS = ['telas','cortinas','persianas','papeles tapiz','pintura','muebles','accesorios','iluminacion','pisos','otros']
const UNIDADES = ['m²','ml','metro','unidad','rollo','caja','litro','kg']
const CAT_COLORS: Record<string, string> = {
  telas: 'bg-pink-100 text-pink-700', cortinas: 'bg-purple-100 text-purple-700',
  persianas: 'bg-blue-100 text-blue-700', 'papeles tapiz': 'bg-yellow-100 text-yellow-700',
  pintura: 'bg-orange-100 text-orange-700', muebles: 'bg-teal-100 text-teal-700',
  accesorios: 'bg-gray-100 text-gray-600', iluminacion: 'bg-amber-100 text-amber-700',
  pisos: 'bg-stone-100 text-stone-600', otros: 'bg-slate-100 text-slate-600',
}

export default function InventarioPage() {
  const [list, setList] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    codigo: '', nombre: '', descripcion: '', categoria: 'telas', unidad: 'm²',
    stock_actual: '', stock_minimo: '', precio_costo: '', precio_venta: '', proveedor: '',
  })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const r = await fetch('/api/inventario')
    if (r.ok) setList(await r.json())
    setLoading(false)
  }

  async function save() {
    if (!form.nombre.trim()) return alertDialog('Ingresa el nombre del producto')
    setSaving(true)
    const r = await fetch('/api/inventario', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, stock_actual: parseFloat(form.stock_actual) || 0, stock_minimo: parseFloat(form.stock_minimo) || 0, precio_costo: parseFloat(form.precio_costo) || 0, precio_venta: parseFloat(form.precio_venta) || 0 }),
    })
    if (r.ok) { setModal(false); load(); setForm({ codigo: '', nombre: '', descripcion: '', categoria: 'telas', unidad: 'm²', stock_actual: '', stock_minimo: '', precio_costo: '', precio_venta: '', proveedor: '' }) }
    setSaving(false)
  }

  const filtered = list.filter(i =>
    (i.nombre.toLowerCase().includes(search.toLowerCase()) || i.codigo?.toLowerCase().includes(search.toLowerCase()) || i.proveedor?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterCat || i.categoria === filterCat)
  )

  const sinStock = list.filter(i => i.stock_actual <= i.stock_minimo).length
  const valorTotal = list.reduce((s, i) => s + i.stock_actual * i.precio_costo, 0)

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Materiales y productos de decoración</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> <span className="hidden sm:inline">Nuevo Producto</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: 'Productos', value: list.length },
          { label: 'Stock bajo', value: sinStock, alert: sinStock > 0 },
          { label: 'Categorías', value: [...new Set(list.map(i => i.categoria))].length },
          { label: 'Valor en stock', value: `S/ ${valorTotal.toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border p-4 ${s.alert ? 'border-orange-200' : 'border-gray-100'}`}>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              {s.alert && <AlertTriangle size={11} className="text-orange-400" />}{s.label}
            </p>
            <p className={`text-xl font-bold ${s.alert ? 'text-orange-600' : 'text-gray-800'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..."
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
              <Package size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No hay productos en inventario</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Código','Nombre','Categoría','Stock','Mín.','Precio Costo','Precio Venta','Proveedor'].map(h =>
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => (
                  <tr key={item.id} className={`hover:bg-gray-50/50 ${item.stock_actual <= item.stock_minimo ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.codigo || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                      {item.descripcion && <p className="text-xs text-gray-400 truncate max-w-40">{item.descripcion}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${CAT_COLORS[item.categoria] ?? 'bg-gray-100 text-gray-600'}`}>{item.categoria}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${item.stock_actual <= item.stock_minimo ? 'text-orange-600' : 'text-gray-800'}`}>
                        {item.stock_actual} {item.unidad}
                        {item.stock_actual <= item.stock_minimo && <AlertTriangle size={12} className="inline ml-1 text-orange-400" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.stock_minimo} {item.unidad}</td>
                    <td className="px-4 py-3 text-gray-600">S/ {item.precio_costo?.toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">S/ {item.precio_venta?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{item.proveedor || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between">
              <h2 className="text-lg font-bold">Nuevo Producto</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Código</label>
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="SKU-001"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Tela blackout premium"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
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
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Unidad</label>
                  <select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Stock actual</label>
                  <input type="number" value={form.stock_actual} onChange={e => setForm(f => ({ ...f, stock_actual: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Stock mínimo</label>
                  <input type="number" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Precio costo (S/)</label>
                  <input type="number" value={form.precio_costo} onChange={e => setForm(f => ({ ...f, precio_costo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Precio venta (S/)</label>
                  <input type="number" value={form.precio_venta} onChange={e => setForm(f => ({ ...f, precio_venta: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Proveedor</label>
                <input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
