'use client'
import { useState, useEffect } from 'react'
import { Map, MapPin, Phone, Mail, TrendingUp } from 'lucide-react'

type Contacto = { id: string; nombre: string; empresa: string; ciudad: string; distrito: string; telefono: string; email: string }

export default function GeoPage() {
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')

  useEffect(() => {
    fetch('/api/contactos').then(r => r.json()).then(d => {
      setContactos(Array.isArray(d) ? d : d.data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const ciudades = contactos.reduce((acc: Record<string, number>, c) => {
    const ciudad = c.ciudad || c.distrito || 'Sin ciudad'
    acc[ciudad] = (acc[ciudad] || 0) + 1
    return acc
  }, {})

  const top = Object.entries(ciudades).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const total = contactos.length

  const filtrados = selected
    ? contactos.filter(c => (c.ciudad || c.distrito) === selected)
    : contactos.slice(0, 20)

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Geolocalización</h1>
        <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Distribución geográfica de clientes y proyectos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa embed */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Map size={16} className="text-brand" />
              <span className="font-semibold text-gray-800">Mapa de clientes — Lima, Perú</span>
            </div>
            <iframe
              src="https://www.openstreetmap.org/export/embed.html?bbox=-77.2,-12.2,-76.8,-11.8&layer=mapnik"
              width="100%"
              height="400"
              style={{ border: 0 }}
              title="Mapa Lima"
            />
            <div className="p-3 text-xs text-gray-400 text-center">
              © OpenStreetMap contributors
            </div>
          </div>
        </div>

        {/* Top ubicaciones */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-brand" /> Top Ubicaciones
            </h3>
            {loading ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : top.length === 0 ? (
              <p className="text-sm text-gray-400">Sin datos de ubicación</p>
            ) : (
              <div className="space-y-3">
                {top.map(([ciudad, count]) => (
                  <button key={ciudad} onClick={() => setSelected(selected === ciudad ? '' : ciudad)}
                    className={`w-full text-left transition ${selected === ciudad ? 'opacity-100' : 'hover:opacity-80'}`}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={`font-medium ${selected === ciudad ? 'text-brand' : 'text-gray-700'}`}>{ciudad}</span>
                      <span className="text-gray-500 text-xs">{count} ({total > 0 ? Math.round(count / total * 100) : 0}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${selected === ciudad ? 'bg-brand' : 'bg-blue-400'}`}
                        style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm">
                {selected ? `Clientes en ${selected}` : 'Clientes recientes'}
              </h3>
              {selected && <button onClick={() => setSelected('')} className="text-xs text-gray-400 hover:text-gray-600">ver todos</button>}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filtrados.length === 0 ? (
                <p className="text-xs text-gray-400">Sin contactos</p>
              ) : filtrados.map(c => (
                <div key={c.id} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <MapPin size={12} className="text-brand mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{c.nombre}</p>
                    {c.empresa && <p className="text-xs text-gray-400 truncate">{c.empresa}</p>}
                    {(c.ciudad || c.distrito) && <p className="text-xs text-gray-400">{c.ciudad || c.distrito}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
