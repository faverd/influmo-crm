'use client'
import { useState, useEffect } from 'react'
import { Plus, Receipt, CheckCircle, XCircle, Clock, Search } from 'lucide-react'

type Factura = {
  id: string; numero: string; cliente_nombre: string; cliente_ruc: string
  estado: string; moneda: string; total: number; fecha_emision: string
  fecha_vencimiento: string; fecha_pago: string; created_at: string
}

const ESTADOS: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  pagada:    { label: 'Pagada',    color: 'bg-green-100 text-green-700' },
  vencida:   { label: 'Vencida',  color: 'bg-red-100 text-red-700' },
  anulada:   { label: 'Anulada',  color: 'bg-gray-100 text-gray-500' },
}

export default function FacturasPage() {
  const [list, setList] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    cliente_nombre: '', cliente_email: '', cliente_ruc: '',
    moneda: 'PEN', fecha_vencimiento: '', notas: '',
    items: [{ descripcion: '', cantidad: 1, precio_unitario: 0, unidad: 'unidad' }],
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/facturas')
    if (r.ok) setList(await r.json())
    setLoading(false)
  }

  const subtotal = form.items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const igv = subtotal * 0.18
  const total = subtotal + igv

  async function save() {
    if (!form.cliente_nombre.trim()) return alert('Ingresa el nombre del cliente')
    setSaving(true)
    const r = await fetch('/api/facturas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (r.ok) { setModal(false); load() }
    setSaving(false)
  }

  async function changeEstado(id: string, estado: string) {
    await fetch(`/api/facturas/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado, ...(estado === 'pagada' ? { fecha_pago: new Date().toISOString().split('T')[0] } : {}) }) })
    load()
  }

  const filtered = list.filter(f => f.cliente_nombre.toLowerCase().includes(search.toLowerCase()) || f.numero?.toLowerCase().includes(search.toLowerCase()))
  const fmt = (n: number, cur = 'PEN') => cur === 'USD' ? `$ ${n.toFixed(2)}` : `S/ ${n.toFixed(2)}`

  const stats = {
    total: list.length,
    pagadas: list.filter(f => f.estado === 'pagada').length,
    pendientes: list.filter(f => f.estado === 'pendiente').length,
    monto: list.filter(f => f.estado === 'pagada').reduce((s, f) => s + f.total, 0),
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de facturación y cobros</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Nueva Factura
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Pagadas', value: stats.pagadas },
          { label: 'Pendientes', value: stats.pendientes },
          { label: 'Cobrado', value: fmt(stats.monto) },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar factura..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Cargando...</div> :
          filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No hay facturas aún</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Número','Cliente','RUC','Fecha','Total','Estado','Acciones'].map(h =>
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-brand font-semibold">{f.numero}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{f.cliente_nombre}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{f.cliente_ruc || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{f.fecha_emision}</td>
                    <td className="px-4 py-3 font-semibold">{fmt(f.total, f.moneda)}</td>
                    <td className="px-4 py-3">
                      <select value={f.estado} onChange={e => changeEstado(f.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer ${ESTADOS[f.estado]?.color}`}>
                        {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{f.fecha_pago ? `Pagado: ${f.fecha_pago}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between">
              <h2 className="text-lg font-bold">Nueva Factura</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente *</label>
                  <input value={form.cliente_nombre} onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">RUC</label>
                  <input value={form.cliente_ruc} onChange={e => setForm(f => ({ ...f, cliente_ruc: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Items</label>
                <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden">
                  <thead className="bg-gray-50"><tr>{['Descripción','Cant.','Precio','Sub.'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}</tr></thead>
                  <tbody>
                    {form.items.map((it, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-2 py-1"><input value={it.descripcion} onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x) }))} className="w-full border-0 text-xs focus:outline-none" /></td>
                        <td className="px-2 py-1 w-16"><input type="number" value={it.cantidad} onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, cantidad: parseFloat(e.target.value) || 0 } : x) }))} className="w-full border-0 text-xs focus:outline-none text-right" /></td>
                        <td className="px-2 py-1 w-20"><input type="number" value={it.precio_unitario} onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, precio_unitario: parseFloat(e.target.value) || 0 } : x) }))} className="w-full border-0 text-xs focus:outline-none text-right" /></td>
                        <td className="px-2 py-1 text-right font-semibold">{(it.cantidad * it.precio_unitario).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => setForm(f => ({ ...f, items: [...f.items, { descripcion: '', cantidad: 1, precio_unitario: 0, unidad: 'unidad' }] }))} className="mt-2 text-xs text-brand hover:underline">+ Agregar línea</button>
              </div>
              <div className="flex justify-end text-sm space-y-1">
                <div className="w-48">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>S/ {subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>IGV 18%</span><span>S/ {igv.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>S/ {total.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Crear Factura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
