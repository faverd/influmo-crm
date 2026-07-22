'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin, Layers, Flame, Boxes, Crosshair, Users, FileText, TrendingUp, Filter } from 'lucide-react'
import { RANGOS, UBICACION_TIPOS, type GeoStats } from '@/lib/geo'
import type { MapMode } from '@/components/geo/map-view'

const MapView = dynamic(() => import('@/components/geo/map-view'), { ssr: false, loading: () => <div className="h-[420px] rounded-xl bg-gray-100 animate-pulse" /> })

const MODES: { id: MapMode; label: string; icon: React.ElementType }[] = [
  { id: 'marcadores', label: 'Marcadores', icon: MapPin },
  { id: 'heatmap', label: 'Mapa de calor', icon: Flame },
  { id: 'cluster', label: 'Agrupado', icon: Boxes },
]
const RADIOS = [5, 10, 25, 50]

export default function GeoMapaPage() {
  const [data, setData] = useState<GeoStats | null>(null)
  const [mode, setMode] = useState<MapMode>('marcadores')
  const [rango, setRango] = useState('todo')
  const [radioKm, setRadioKm] = useState<number | undefined>()
  const [radioCentro, setRadioCentro] = useState<[number, number] | undefined>()

  useEffect(() => {
    fetch(`/api/geo/stats?rango=${rango}`).then(r => r.json()).then(setData).catch(() => setData({ totals: { contactos: 0, clientes: 0, cotizaciones: 0, ventas: 0, monto: 0 }, zonas: [], points: [] }))
  }, [rango])

  const t = data?.totals
  const topZonas = useMemo(() => (data?.zonas ?? []).slice(0, 8), [data])

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2"><MapPin size={22} className="text-brand" /> Mapa Comercial</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">Geolocalización de clientes, cotizaciones y ventas</p>
        </div>
        <Link href="/geo/ubicaciones" className="text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Gestionar ubicaciones</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium ${mode === m.id ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'}`}><m.icon size={14} /> <span className="hidden sm:inline">{m.label}</span></button>
          ))}
        </div>
        <select value={rango} onChange={e => setRango(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
          {RANGOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
          <Crosshair size={14} className="text-gray-400 mx-1" />
          {RADIOS.map(km => (
            <button key={km} onClick={() => setRadioKm(radioKm === km ? undefined : km)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${radioKm === km ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{km} km</button>
          ))}
        </div>
        {radioKm && <span className="text-xs text-gray-400 flex items-center gap-1"><Filter size={12} /> Clic en el mapa para fijar el centro del radio</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
        {[
          { l: 'Contactos', v: t?.contactos ?? 0, i: Users, c: '#2563eb' },
          { l: 'Clientes', v: t?.clientes ?? 0, i: Users, c: '#16a34a' },
          { l: 'Cotizaciones', v: t?.cotizaciones ?? 0, i: FileText, c: '#d97706' },
          { l: 'Ventas', v: t?.ventas ?? 0, i: TrendingUp, c: '#7c3aed' },
          { l: 'Monto', v: `S/ ${(t?.monto ?? 0).toLocaleString('es-PE')}`, i: TrendingUp, c: '#0d9488' },
        ].map(k => (
          <div key={k.l} className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1" style={{ background: k.c + '18', color: k.c }}><k.i size={15} /></div>
            <p className="text-lg font-bold text-gray-900">{k.v}</p><p className="text-[11px] text-gray-400">{k.l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <MapView points={data?.points ?? []} zonas={data?.zonas ?? []} mode={mode} height={520}
          radioKm={radioKm} radioCentro={radioCentro} onPick={radioKm ? (la, lo) => setRadioCentro([la, lo]) : undefined} />

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3"><Layers size={16} className="text-brand" /><h3 className="font-semibold text-gray-900 text-sm">Top Ubicaciones</h3></div>
          {topZonas.length === 0 ? <p className="text-xs text-gray-400 py-4 text-center">Sin datos geográficos aún</p> : (
            <div className="space-y-3">
              {topZonas.map(z => (
                <div key={z.departamento}>
                  <div className="flex justify-between text-xs mb-1"><span className="font-medium text-gray-700">{z.departamento}</span><span className="text-gray-400">{z.pct}%</span></div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${z.pct}%` }} /></div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{z.clientes} clientes · {z.cotizaciones} cotiz. · S/ {z.monto.toLocaleString('es-PE')}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 mb-2">Leyenda</p>
            <div className="flex flex-wrap gap-2">
              {UBICACION_TIPOS.map(tp => <span key={tp.id} className="flex items-center gap-1 text-[11px] text-gray-600"><span className="w-2.5 h-2.5 rounded-full" style={{ background: tp.color }} /> {tp.label}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
