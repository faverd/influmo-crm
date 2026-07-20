'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, FileText, CheckCircle, XCircle, Clock, Send, Eye, Trash2 } from 'lucide-react'

type Item = { descripcion: string; cantidad: number; precio_unitario: number; unidad: string }
type Cotizacion = {
  id: string; numero: string; cliente_nombre: string; cliente_email: string
  estado: string; moneda: string; subtotal: number; igv: number; total: number
  items: Item[]; notas: string; fecha_emision: string; fecha_vencimiento: string
  created_at: string
}

const ESTADOS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  borrador:  { label: 'Borrador',  color: 'bg-gray-100 text-gray-600',   icon: FileText },
  enviada:   { label: 'Enviada',   color: 'bg-blue-100 text-blue-700',   icon: Send },
  aprobada:  { label: 'Aprobada',  color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-700',     icon: XCircle },
  vencida:   { label: 'Vencida',   color: 'bg-orange-100 text-orange-700', icon: Clock },
}

const EMPTY_ITEM: Item = { descripcion: '', cantidad: 1, precio_unitario: 0, unidad: 'm²' }

export default function CotizacionesPage() {
  const [list, setList] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [view, setView] = useState<Cotizacion | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    cliente_nombre: '', cliente_email: '', cliente_telefono: '',
    moneda: 'PEN', fecha_vencimiento: '', notas: '',
    items: [{ ...EMPTY_ITEM }],
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/cotizaciones')
    if (r.ok) setList(await r.json())
    setLoading(false)
  }

  const subtotal = form.items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const igv = subtotal * 0.18
  const total = subtotal + igv

  function addItem() { setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] })) }
  function removeItem(idx: number) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })) }
  function updateItem(idx: number, field: keyof Item, val: string | number) {
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }))
  }

  async function save() {
    if (!form.cliente_nombre.trim()) return alert('Ingresa el nombre del cliente')
    setSaving(true)
    const r = await fetch('/api/cotizaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) { setModal(false); load(); setForm({ cliente_nombre: '', cliente_email: '', cliente_telefono: '', moneda: 'PEN', fecha_vencimiento: '', notas: '', items: [{ ...EMPTY_ITEM }] }) }
    setSaving(false)
  }

  async function changeEstado(id: string, estado: string) {
    await fetch(`/api/cotizaciones/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) })
    load()
  }

  const filtered = list.filter(c =>
    c.cliente_nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.numero.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: list.length,
    aprobadas: list.filter(c => c.estado === 'aprobada').length,
    pendientes: list.filter(c => ['borrador','enviada'].includes(c.estado)).length,
    monto: list.filter(c => c.estado === 'aprobada').reduce((s, c) => s + c.total, 0),
  }

  const fmt = (n: number, cur = 'PEN') => cur === 'USD'
    ? `$ ${n.toFixed(2)}`
    : `S/ ${n.toFixed(2)}`

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona presupuestos para tus clientes</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition">
          <Plus size={16} /> Nueva Cotización
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-700' },
          { label: 'Aprobadas', value: stats.aprobadas, color: 'text-green-600' },
          { label: 'Pendientes', value: stats.pendientes, color: 'text-blue-600' },
          { label: 'Monto Aprobado', value: fmt(stats.monto), color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente o número..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No hay cotizaciones aún</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Número','Cliente','Fecha','Vencimiento','Total','Estado','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => {
                const est = ESTADOS[c.estado] ?? ESTADOS.borrador
                const EstIcon = est.icon
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-brand font-semibold">{c.numero}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{c.cliente_nombre}</p>
                      {c.cliente_email && <p className="text-xs text-gray-400">{c.cliente_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.fecha_emision}</td>
                    <td className="px-4 py-3 text-gray-500">{c.fecha_vencimiento || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{fmt(c.total, c.moneda)}</td>
                    <td className="px-4 py-3">
                      <select value={c.estado} onChange={e => changeEstado(c.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer ${est.color}`}>
                        {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setView(c)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva Cotización */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Nueva Cotización</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente *</label>
                  <input value={form.cliente_nombre} onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))}
                    placeholder="Nombre del cliente"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Moneda</label>
                  <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="PEN">S/ Soles</option>
                    <option value="USD">$ Dólares</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
                  <input value={form.cliente_email} onChange={e => setForm(f => ({ ...f, cliente_email: e.target.value }))}
                    placeholder="email@cliente.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Vencimiento</label>
                  <input type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Productos / Servicios</label>
                  <button onClick={addItem} className="text-xs text-brand hover:underline flex items-center gap-1">
                    <Plus size={12} /> Agregar línea
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Descripción','Unid.','Cant.','Precio Unit.','Subtotal',''].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5">
                            <input value={item.descripcion} onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                              placeholder="Ej: Cortinas blackout"
                              className="w-full border-0 text-xs focus:outline-none bg-transparent" />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <select value={item.unidad} onChange={e => updateItem(idx, 'unidad', e.target.value)}
                              className="w-full border-0 text-xs focus:outline-none bg-transparent">
                              {['m²','ml','unidad','juego','servicio','hora'].map(u => <option key={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 w-16">
                            <input type="number" min="0" value={item.cantidad} onChange={e => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                              className="w-full border-0 text-xs focus:outline-none bg-transparent text-right" />
                          </td>
                          <td className="px-2 py-1.5 w-24">
                            <input type="number" min="0" value={item.precio_unitario} onChange={e => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              className="w-full border-0 text-xs focus:outline-none bg-transparent text-right" />
                          </td>
                          <td className="px-2 py-1.5 w-24 text-right font-semibold text-gray-700">
                            {(item.cantidad * item.precio_unitario).toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 w-8">
                            {form.items.length > 1 && (
                              <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="flex justify-end">
                <div className="w-56 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{form.moneda === 'USD' ? '$ ' : 'S/ '}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>IGV (18%)</span>
                    <span>{form.moneda === 'USD' ? '$ ' : 'S/ '}{igv.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                    <span>Total</span>
                    <span>{form.moneda === 'USD' ? '$ ' : 'S/ '}{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2} placeholder="Condiciones, tiempo de entrega, garantías..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Crear Cotización'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver */}
      {view && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{view.numero}</h2>
                <p className="text-sm text-gray-500">{view.cliente_nombre}</p>
              </div>
              <button onClick={() => setView(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-400">Estado: </span><span className="font-medium">{ESTADOS[view.estado]?.label}</span></div>
                <div><span className="text-gray-400">Moneda: </span><span className="font-medium">{view.moneda}</span></div>
                <div><span className="text-gray-400">Emisión: </span><span className="font-medium">{view.fecha_emision}</span></div>
                <div><span className="text-gray-400">Vence: </span><span className="font-medium">{view.fecha_vencimiento || '—'}</span></div>
              </div>
              <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>{['Descripción','Cant.','Precio','Subtotal'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(view.items as Item[]).map((it, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{it.descripcion} ({it.unidad})</td>
                      <td className="px-3 py-2">{it.cantidad}</td>
                      <td className="px-3 py-2">{it.precio_unitario.toFixed(2)}</td>
                      <td className="px-3 py-2 font-semibold">{(it.cantidad * it.precio_unitario).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-52 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(view.subtotal, view.moneda)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>IGV 18%</span><span>{fmt(view.igv, view.moneda)}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1"><span>Total</span><span>{fmt(view.total, view.moneda)}</span></div>
                </div>
              </div>
              {view.notas && <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{view.notas}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
