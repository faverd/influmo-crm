'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Circle, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { UBICACION_TIPOS, escalaColor, type GeoPoint, type GeoZona } from '@/lib/geo'

export type MapMode = 'marcadores' | 'heatmap' | 'cluster'

function tipoMeta(tipo: string) { return UBICACION_TIPOS.find(t => t.id === tipo) ?? UBICACION_TIPOS[0] }

function FitOnData({ points }: { points: GeoPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length) {
      const b = L.latLngBounds(points.map(p => [p.lat, p.lon] as [number, number]))
      try { map.fitBounds(b.pad(0.2), { maxZoom: 7 }) } catch {}
    }
  }, [points, map])
  return null
}

function ClickPicker({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  const map = useMap()
  useEffect(() => {
    const h = (e: L.LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng)
    map.on('click', h)
    return () => { map.off('click', h) }
  }, [map, onPick])
  return null
}

export default function MapView({
  points = [], zonas = [], mode = 'marcadores', height = 420,
  center = [-9.19, -75.02], zoom = 5, radioKm, radioCentro, onPick,
}: {
  points?: GeoPoint[]; zonas?: GeoZona[]; mode?: MapMode; height?: number | string
  center?: [number, number]; zoom?: number; radioKm?: number; radioCentro?: [number, number]
  onPick?: (lat: number, lon: number) => void
}) {
  const maxTotal = useMemo(() => Math.max(1, ...zonas.map(z => z.total)), [zonas])

  return (
    <div style={{ height }} className="w-full rounded-xl overflow-hidden border border-gray-100 z-0">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {(mode === 'heatmap' || mode === 'cluster') && zonas.map(z => {
          if (z.lat == null || z.lon == null) return null
          const frac = z.total / maxTotal
          const r = 12 + frac * 34
          return (
            <CircleMarker key={z.departamento} center={[z.lat, z.lon]} radius={r}
              pathOptions={{ color: escalaColor(frac), fillColor: escalaColor(frac), fillOpacity: mode === 'heatmap' ? 0.55 : 0.7, weight: 1 }}>
              {mode === 'cluster' && <Tooltip permanent direction="center" className="!bg-transparent !border-0 !shadow-none !text-white !font-bold !text-xs">{z.total}</Tooltip>}
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-sm mb-1">{z.departamento}</p>
                  <p>Clientes: {z.clientes}</p>
                  <p>Contactos: {z.contactos}</p>
                  <p>Cotizaciones: {z.cotizaciones}</p>
                  <p>Ventas: {z.ventas} · S/ {z.monto.toLocaleString('es-PE')}</p>
                  <p className="text-gray-400">{z.pct}% de actividad</p>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

        {mode === 'marcadores' && points.map((p, i) => {
          const m = tipoMeta(p.tipo)
          const icon = L.divIcon({
            className: '', html: `<div style="background:${m.color};width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:11px">${m.icon}</span></div>`,
            iconSize: [22, 22], iconAnchor: [11, 22],
          })
          return (
            <Marker key={i} position={[p.lat, p.lon]} icon={icon}>
              <Popup>
                <div className="text-xs"><p className="font-bold">{p.nombre || m.label}</p><p className="text-gray-500">{m.label}{p.departamento ? ` · ${p.departamento}` : ''}</p></div>
              </Popup>
            </Marker>
          )
        })}

        {radioCentro && radioKm ? (
          <>
            <Circle center={radioCentro} radius={radioKm * 1000} pathOptions={{ color: '#0d9488', fillColor: '#0d9488', fillOpacity: 0.08, weight: 1.5 }} />
            <CircleMarker center={radioCentro} radius={5} pathOptions={{ color: '#0d9488', fillColor: '#0d9488', fillOpacity: 1 }} />
          </>
        ) : null}

        {mode === 'marcadores' && <FitOnData points={points} />}
        {onPick && <ClickPicker onPick={onPick} />}
      </MapContainer>
    </div>
  )
}
