'use client'

import { useEffect, useState } from 'react'
import { PieChart, TrendingUp, MapPin, Store } from 'lucide-react'

interface Contacto { id: string; ciudad?: string; distrito?: string }
interface Cotizacion { id: string; cliente_direccion?: string; total: number; estado: string }

const BAR_COLORS = ['#0d9488', '#3b82f6', '#a855f7', '#f97316', '#ef4444', '#ec4899', '#14b8a6', '#6366f1']

export default function AnaliticaGeograficaPage() {
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [ubicaciones, setUbicaciones] = useState<{ ciudad: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/contactos').then(r => r.json()).catch(() => []),
      fetch('/api/cotizaciones').then(r => r.json()).catch(() => []),
      fetch('/api/geo/ubicaciones').then(r => r.json()).catch(() => []),
    ]).then(([c, q, u]) => {
      setContactos(Array.isArray(c) ? c : c.data ?? [])
      setCotizaciones(Array.isArray(q) ? q : [])
      setUbicaciones(Array.isArray(u) ? u : [])
      setLoading(false)
    })
  }, [])

  const porZona = contactos.reduce((acc: Record<string, number>, c) => {
    const z = c.ciudad || c.distrito || 'Sin zona'
    acc[z] = (acc[z] || 0) + 1
    return acc
  }, {})
  const zonasSorted = Object.entries(porZona).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxZona = Math.max(1, ...zonasSorted.map(([, v]) => v))
  const total = contactos.length

  const aprobadas = cotizaciones.filter(c => c.estado === 'aprobada')
  const montoTotal = aprobadas.reduce((s, c) => s + (c.total || 0), 0)

  const porCiudadUbic = ubicaciones.reduce((acc: Record<string, number>, u) => {
    const c = u.ciudad || 'Sin ciudad'
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <PieChart size={22} className="text-brand" />
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Analítica Geográfica</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Concentración de clientes, ventas y presencia comercial por zona</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: 'Clientes totales',    value: total,                              icon: MapPin, color: 'bg-blue-50 text-blue-600' },
          { label: 'Zonas activas',       value: Object.keys(porZona).length,        icon: PieChart, color: 'bg-purple-50 text-purple-600' },
          { label: 'Cotizaciones aprob.', value: aprobadas.length,                   icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Puntos comerciales',  value: ubicaciones.length,                 icon: Store, color: 'bg-teal-50 text-teal-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.color}`}><c.icon size={16} /></div>
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : c.value}</p>
            <p className="text-xs text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart por zona */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-semibold text-gray-900 mb-4">Clientes por zona</p>
          {zonasSorted.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">Sin datos suficientes</p>
          ) : (
            <div className="space-y-3">
              {zonasSorted.map(([zona, count], i) => (
                <div key={zona}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{zona}</span>
                    <span className="text-gray-400">{count} ({total > 0 ? Math.round(count / total * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxZona) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Presencia comercial */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-semibold text-gray-900 mb-4">Presencia comercial por ciudad</p>
          {Object.keys(porCiudadUbic).length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">Aún no hay ubicaciones comerciales registradas</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(porCiudadUbic).sort((a, b) => b[1] - a[1]).map(([ciudad, count]) => (
                <div key={ciudad} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 flex items-center gap-1.5"><Store size={12} className="text-brand" /> {ciudad}</span>
                  <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monto aprobado */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:col-span-2">
          <p className="font-semibold text-gray-900 mb-1">Monto de cotizaciones aprobadas</p>
          <p className="text-xs text-gray-400 mb-3">Total facturable confirmado a nivel general</p>
          <p className="text-3xl font-bold text-green-600">S/ {montoTotal.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
