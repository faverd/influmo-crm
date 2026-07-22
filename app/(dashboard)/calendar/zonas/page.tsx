'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPinned, Calendar as CalendarIcon, ArrowRight, ChevronLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CalEvent } from '@/components/full-calendar'
import { ZONAS_LIMA } from '@/components/full-calendar'

export default function EventosPorZonaPage() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedZona, setSelectedZona] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cal_events_main')
      if (saved) setEvents(JSON.parse(saved))
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const zonaCounts = ZONAS_LIMA.reduce((acc: Record<string, CalEvent[]>, z) => {
    acc[z] = events.filter(e => e.zona === z)
    return acc
  }, {})
  const sinZona = events.filter(e => !e.zona)

  const zonasConEventos = ZONAS_LIMA.filter(z => zonaCounts[z]?.length > 0)
  const maxCount = Math.max(1, ...zonasConEventos.map(z => zonaCounts[z].length))

  const eventosDeZona = selectedZona
    ? (selectedZona === '__sin_zona__' ? sinZona : zonaCounts[selectedZona] ?? [])
    : []

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MapPinned size={22} className="text-brand" />
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Eventos por zona</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Distribución de citas, instalaciones y visitas por distrito de Lima</p>
        </div>
      </div>

      {!loaded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : selectedZona ? (
        <div>
          <button onClick={() => setSelectedZona(null)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-4">
            <ChevronLeft size={15} /> Volver a zonas
          </button>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {selectedZona === '__sin_zona__' ? 'Sin zona asignada' : selectedZona}
            <span className="text-sm font-normal text-gray-400 ml-2">({eventosDeZona.length} evento{eventosDeZona.length !== 1 ? 's' : ''})</span>
          </h2>
          {eventosDeZona.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <CalendarIcon size={30} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Sin eventos en esta zona</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventosDeZona
                .sort((a, b) => (a.date + (a.time ?? '00:00')).localeCompare(b.date + (b.time ?? '00:00')))
                .map(ev => (
                  <div key={ev.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm transition"
                    style={{ borderLeft: `3px solid ${ev.color ?? '#0d9488'}` }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        {ev.emoji && <span>{ev.emoji}</span>} {ev.title}
                        {ev.date === todayStr && <span className="text-[10px] bg-brand/10 text-brand font-semibold px-1.5 py-0.5 rounded-full">Hoy</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(parseISO(ev.date), "d 'de' MMMM yyyy", { locale: es })}
                        {ev.time && ` · ${ev.time}${ev.endTime ? `–${ev.endTime}` : ''}`}
                        {ev.location && ` · 📍 ${ev.location}`}
                      </p>
                      {ev.description && <p className="text-xs text-gray-500 mt-1">{ev.description}</p>}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {zonasConEventos.length === 0 && sinZona.length === 0 ? (
            <div className="text-center py-20">
              <MapPinned size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm mb-1">Aún no hay eventos con zona asignada</p>
              <Link href="/calendar" className="text-brand text-sm hover:underline inline-flex items-center gap-1">
                Ir al calendario y crear uno <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {zonasConEventos.map(z => (
                <button key={z} onClick={() => setSelectedZona(z)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-brand/30 transition group">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-900 text-sm">{z}</p>
                    <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{zonaCounts[z].length}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${(zonaCounts[z].length / maxCount) * 100}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1 group-hover:text-brand transition">
                    Ver eventos <ArrowRight size={11} />
                  </p>
                </button>
              ))}
              {sinZona.length > 0 && (
                <button onClick={() => setSelectedZona('__sin_zona__')}
                  className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-4 text-left hover:shadow-sm hover:border-gray-300 transition group">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-500 text-sm">Sin zona asignada</p>
                    <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{sinZona.length}</span>
                  </div>
                  <p className="text-xs text-gray-400">Asigna una zona al crear o editar el evento</p>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
