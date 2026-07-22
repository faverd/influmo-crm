'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Trash2, MapPin, Search, Loader2, X, Store } from 'lucide-react'
import { UBICACION_TIPOS, UBICACION_ESTADOS } from '@/lib/geo'
import { alertDialog, confirmDialog } from '@/lib/dialogs'

const MapView = dynamic(() => import('@/components/geo/map-view'), { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-gray-100 animate-pulse" /> })

interface Ubic {
  id: string; nombre: string; tipo: string; cliente_nombre: string | null; direccion: string | null
  pais: string | null; departamento: string | null; provincia: string | null; distrito: string | null
  lat: number | null; lon: number | null; responsable: string | null; telefono: string | null; estado: string
}
const EMPTY = { nombre: '', tipo: 'tienda', cliente_nombre: '', direccion: '', pais: 'Perú', departamento: '', provincia: '', distrito: '', lat: null as number | null, lon: null as number | null, responsable: '', telefono: '', estado: 'activo' }

export default function UbicacionesPage() {
  const [rows, setRows] = useState<Ubic[]>([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)

  function load() { setLoading(true); fetch('/api/geo/ubicaciones').then(r => r.json()).then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(load, [])

  async function del(id: string) {
    if (!await confirmDialog('¿Eliminar esta ubicación?', { danger: true, confirmLabel: 'Eliminar' })) return
    setRows(l => l.filter(x => x.id !== id))
    await fetch(`/api/geo/ubicaciones?id=${id}`, { method: 'DELETE' })
  }

  const points = rows.filter(r => r.lat != null && r.lon != null).map(r => ({ lat: r.lat!, lon: r.lon!, tipo: r.tipo, nombre: r.nombre, departamento: r.departamento || '' }))

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2"><Store size={22} className="text-brand" /> Ubicaciones Comerciales</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">Tiendas, sucursales y puntos de venta geolocalizados</p>
        </div>
        <button onClick={() => setShow(true)} className="flex items-center gap-1.5 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"><Plus size={16} /> <span className="hidden sm:inline">Nueva ubicación</span></button>
      </div>

      {points.length > 0 && <div className="mb-4"><MapView points={points} mode="marcadores" height={300} /></div>}

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        {loading ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-gray-300" /></div>
          : rows.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">Aún no hay ubicaciones registradas</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-3">Nombre</th><th className="py-2 pr-3">Tipo</th><th className="py-2 pr-3">Cliente</th><th className="py-2 pr-3 hidden sm:table-cell">Ubicación</th><th className="py-2 pr-3">Estado</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.map(r => {
                    const tp = UBICACION_TIPOS.find(t => t.id === r.tipo); const es = UBICACION_ESTADOS.find(e => e.id === r.estado)
                    return (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-gray-800">{r.nombre}</td>
                        <td className="py-2.5 pr-3"><span className="text-xs flex items-center gap-1 whitespace-nowrap">{tp?.icon} {tp?.label}</span></td>
                        <td className="py-2.5 pr-3 text-gray-600">{r.cliente_nombre || '—'}</td>
                        <td className="py-2.5 pr-3 text-gray-500 hidden sm:table-cell text-xs">{[r.distrito, r.provincia, r.departamento].filter(Boolean).join(', ') || '—'}</td>
                        <td className="py-2.5 pr-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${es?.cls}`}>{es?.label}</span></td>
                        <td className="py-2.5"><button onClick={() => del(r.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {show && <UbicModal onClose={() => setShow(false)} onSaved={() => { setShow(false); load() }} />}
    </div>
  )
}

function UbicModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ ...EMPTY })
  const [q, setQ] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [results, setResults] = useState<{ lat: number; lon: number; direccion: string; departamento: string; provincia: string; distrito: string; pais: string }[]>([])
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f, v: unknown) => setF(p => ({ ...p, [k]: v }))

  async function geocode() {
    if (!q.trim()) return
    setGeocoding(true); setResults([])
    try { const r = await fetch(`/api/geo/geocode?q=${encodeURIComponent(q)}`); const d = await r.json(); setResults(Array.isArray(d) ? d : []) } finally { setGeocoding(false) }
  }
  function pick(r: typeof results[0]) {
    setF(p => ({ ...p, direccion: r.direccion, lat: r.lat, lon: r.lon, departamento: r.departamento, provincia: r.provincia, distrito: r.distrito, pais: r.pais || 'Perú' }))
    setResults([])
  }
  async function save() {
    if (!f.nombre.trim()) { await alertDialog('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/geo/ubicaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      if (res.ok) onSaved(); else await alertDialog((await res.json().catch(() => ({}))).error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20'

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white"><h2 className="font-semibold text-gray-900">Nueva ubicación comercial</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button></div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre *" className={inputCls} />
            <select value={f.tipo} onChange={e => set('tipo', e.target.value)} className={`${inputCls} bg-white`}>{UBICACION_TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
          </div>
          <input value={f.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)} placeholder="Cliente asociado" className={inputCls} />

          <div>
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1"><MapPin size={12} className="text-brand" /> Buscar dirección (geocodificación automática)</label>
            <div className="flex gap-2">
              <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); geocode() } }} placeholder="Av. Javier Prado 1234, San Isidro, Lima" className={`${inputCls} flex-1`} />
              <button onClick={geocode} disabled={geocoding} className="bg-brand text-white px-3 rounded-xl hover:opacity-90 disabled:opacity-50">{geocoding ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}</button>
            </div>
            {results.length > 0 && (
              <div className="mt-1 border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-40 overflow-auto">
                {results.map((r, i) => <button key={i} onClick={() => pick(r)} className="block w-full text-left px-3 py-2 text-xs hover:bg-brand/5">{r.direccion}</button>)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input value={f.departamento} onChange={e => set('departamento', e.target.value)} placeholder="Departamento" className={inputCls} />
            <input value={f.provincia} onChange={e => set('provincia', e.target.value)} placeholder="Provincia" className={inputCls} />
            <input value={f.distrito} onChange={e => set('distrito', e.target.value)} placeholder="Distrito" className={inputCls} />
          </div>
          <input value={f.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Dirección" className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input value={f.lat ?? ''} onChange={e => set('lat', e.target.value ? Number(e.target.value) : null)} placeholder="Latitud" className={inputCls} />
            <input value={f.lon ?? ''} onChange={e => set('lon', e.target.value ? Number(e.target.value) : null)} placeholder="Longitud" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={f.responsable} onChange={e => set('responsable', e.target.value)} placeholder="Responsable" className={inputCls} />
            <input value={f.telefono} onChange={e => set('telefono', e.target.value)} placeholder="Teléfono" className={inputCls} />
          </div>
          <select value={f.estado} onChange={e => set('estado', e.target.value)} className={`${inputCls} bg-white`}>{UBICACION_ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
