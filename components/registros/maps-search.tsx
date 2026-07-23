'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Link2, MapPin } from 'lucide-react'

export interface MapsResult {
  direccion: string; lat: number; lon: number
  pais: string; departamento: string; provincia: string; distrito: string
}

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

// Buscador de direcciones estilo Google Maps con dropdown de resultados.
// Usa /api/geo/geocode (OpenStreetMap/Nominatim, sin costo).
export function MapsSearch({ onSelect, placeholder = 'Buscar en Google Maps…', current }: {
  onSelect: (r: MapsResult) => void
  placeholder?: string
  current?: { lat?: number | null; lon?: number | null; direccion?: string }
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<MapsResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 3) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/geo/geocode?q=${encodeURIComponent(q)}`)
        const d = await r.json()
        setResults(Array.isArray(d) ? d : [])
        setOpen(true)
      } catch { setResults([]) } finally { setLoading(false) }
    }, 450)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q])

  const mapsLink = current?.lat != null && current?.lon != null
    ? `https://www.google.com/maps/search/?api=1&query=${current.lat},${current.lon}`
    : current?.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(current.direccion)}` : null

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand/30">
        <GoogleG />
        <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder} className="flex-1 text-sm outline-none bg-transparent" />
        {loading && <Loader2 size={15} className="animate-spin text-gray-400" />}
        {mapsLink && (
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" title="Abrir en Google Maps"
            className="w-7 h-7 flex items-center justify-center rounded-full border border-brand/40 text-brand hover:bg-brand/10 shrink-0"><Link2 size={15} /></a>
        )}
      </div>

      {open && (results.length > 0 || (!loading && q.trim().length >= 3)) && (
        <div className="absolute z-[80] left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-64 overflow-auto">
          {results.length === 0
            ? <p className="px-3 py-3 text-xs text-gray-400">Sin resultados</p>
            : results.map((r, i) => (
              <button key={i} type="button" onClick={() => { onSelect(r); setQ(''); setResults([]); setOpen(false) }}
                className="flex items-start gap-2 w-full text-left px-3 py-2 hover:bg-brand/5 border-b border-gray-50 last:border-0">
                <MapPin size={14} className="text-rose-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-800 leading-snug">{r.direccion}</p>
                  {(r.distrito || r.departamento) && <p className="text-[10px] text-gray-400">{[r.distrito, r.provincia, r.departamento].filter(Boolean).join(', ')}</p>}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
