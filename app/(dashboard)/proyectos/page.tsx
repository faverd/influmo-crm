'use client'
import { useState, useEffect } from 'react'
import { Plus, HardHat, Search, Calendar, DollarSign, CheckSquare } from 'lucide-react'
import { alertDialog } from '@/lib/dialogs'

type Proyecto = {
  id: string; nombre: string; descripcion: string; cliente_nombre: string
  estado: string; tipo: string; direccion: string; presupuesto: number
  moneda: string; fecha_inicio: string; fecha_fin: string; progreso: number; notas: string
  created_at: string
}

const ESTADOS: Record<string, { label: string; color: string }> = {
  planificacion: { label: 'Planificación', color: 'bg-blue-100 text-blue-700' },
  en_progreso:   { label: 'En Progreso',   color: 'bg-yellow-100 text-yellow-700' },
  pausado:       { label: 'Pausado',        color: 'bg-gray-100 text-gray-600' },
  completado:    { label: 'Completado',     color: 'bg-green-100 text-green-700' },
  cancelado:     { label: 'Cancelado',      color: 'bg-red-100 text-red-700' },
}

const TIPOS = ['decoracion','cortinas','tapizado','pintura','mobiliario','iluminacion','integral','otro']

export default function ProyectosPage() {
  const [list, setList] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Proyecto | null>(null)
  const [form, setForm] = useState({
    nombre: '', descripcion: '', cliente_nombre: '', estado: 'planificacion',
    tipo: 'decoracion', direccion: '', presupuesto: '', moneda: 'PEN',
    fecha_inicio: '', fecha_fin: '', progreso: '0', notas: '',
  })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const r = await fetch('/api/proyectos')
    if (r.ok) setList(await r.json())
    setLoading(false)
  }

  async function save() {
    if (!form.nombre.trim() || !form.cliente_nombre.trim()) return alertDialog('Nombre y cliente son requeridos')
    setSaving(true)
    const r = await fetch('/api/proyectos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, presupuesto: parseFloat(form.presupuesto) || 0, progreso: parseInt(form.progreso) || 0 }),
    })
    if (r.ok) { setModal(false); load(); setForm({ nombre: '', descripcion: '', cliente_nombre: '', estado: 'planificacion', tipo: 'decoracion', direccion: '', presupuesto: '', moneda: 'PEN', fecha_inicio: '', fecha_fin: '', progreso: '0', notas: '' }) }
    setSaving(false)
  }

  async function updateProgreso(id: string, progreso: number) {
    await fetch(`/api/proyectos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progreso }) })
    load()
  }

  const filtered = list.filter(p =>
    (p.nombre.toLowerCase().includes(search.toLowerCase()) || p.cliente_nombre.toLowerCase().includes(search.toLowerCase())) &&
    (!filterEstado || p.estado === filterEstado)
  )

  const stats = {
    total: list.length,
    activos: list.filter(p => p.estado === 'en_progreso').length,
    completados: list.filter(p => p.estado === 'completado').length,
    presupuesto: list.filter(p => p.estado !== 'cancelado').reduce((s, p) => s + p.presupuesto, 0),
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Seguimiento de proyectos de decoración</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> <span className="hidden sm:inline">Nuevo Proyecto</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: 'Total', value: stats.total },
          { label: 'En progreso', value: stats.activos },
          { label: 'Completados', value: stats.completados },
          { label: 'Presupuesto total', value: `S/ ${stats.presupuesto.toFixed(0)}` },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proyecto o cliente..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
        </div>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? <div className="p-8 text-center text-gray-400">Cargando...</div> :
        filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-100">
            <HardHat size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No hay proyectos aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => {
              const est = ESTADOS[p.estado] ?? ESTADOS.planificacion
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition cursor-pointer" onClick={() => setSelected(p)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{p.nombre}</h3>
                      <p className="text-sm text-gray-500">{p.cliente_nombre}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ml-2 whitespace-nowrap ${est.color}`}>{est.label}</span>
                  </div>
                  {p.descripcion && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{p.descripcion}</p>}

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progreso</span>
                      <span>{p.progreso}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${p.progreso}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="capitalize bg-gray-50 px-2 py-0.5 rounded">{p.tipo}</span>
                    {p.presupuesto > 0 && (
                      <span className="font-semibold text-green-600">S/ {p.presupuesto.toFixed(0)}</span>
                    )}
                  </div>
                  {(p.fecha_inicio || p.fecha_fin) && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={11} />
                      {p.fecha_inicio} {p.fecha_fin ? `→ ${p.fecha_fin}` : ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      }

      {/* Modal Detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between">
              <div>
                <h2 className="text-lg font-bold">{selected.nombre}</h2>
                <p className="text-sm text-gray-500">{selected.cliente_nombre}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Progreso: {selected.progreso}%</label>
                <input type="range" min="0" max="100" value={selected.progreso}
                  onChange={e => setSelected(s => s ? { ...s, progreso: parseInt(e.target.value) } : null)}
                  onMouseUp={() => selected && updateProgreso(selected.id, selected.progreso)}
                  className="w-full accent-brand" />
                <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${selected.progreso}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Estado: </span><span className="font-medium">{ESTADOS[selected.estado]?.label}</span></div>
                <div><span className="text-gray-400">Tipo: </span><span className="font-medium capitalize">{selected.tipo}</span></div>
                <div><span className="text-gray-400">Inicio: </span><span className="font-medium">{selected.fecha_inicio || '—'}</span></div>
                <div><span className="text-gray-400">Fin: </span><span className="font-medium">{selected.fecha_fin || '—'}</span></div>
                {selected.presupuesto > 0 && <div className="col-span-2"><span className="text-gray-400">Presupuesto: </span><span className="font-bold text-green-600">S/ {selected.presupuesto.toFixed(2)}</span></div>}
                {selected.direccion && <div className="col-span-2"><span className="text-gray-400">Dirección: </span><span className="font-medium">{selected.direccion}</span></div>}
              </div>
              {selected.notas && <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{selected.notas}</p>}
            </div>
            <div className="p-6 border-t flex justify-end">
              <button onClick={() => setSelected(null)} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between">
              <h2 className="text-lg font-bold">Nuevo Proyecto</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre del proyecto *</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Decoración sala principal"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente *</label>
                  <input value={form.cliente_nombre} onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Presupuesto (S/)</label>
                  <input type="number" value={form.presupuesto} onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Estado</label>
                  <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Fecha fin</label>
                  <input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Dirección</label>
                  <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Av. Principal 123, Lima"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Descripción</label>
                  <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Crear Proyecto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
