import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Geocodificación vía OpenStreetMap / Nominatim (gratis, sin API key). Server-side por CORS y User-Agent.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')
  const lat = req.nextUrl.searchParams.get('lat')
  const lon = req.nextUrl.searchParams.get('lon')
  const headers = { 'User-Agent': 'CRM-Mavilex/1.0 (geocoding)', 'Accept-Language': 'es' }

  try {
    if (lat && lon) {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`, { headers })
      const d = await r.json()
      const a = d.address ?? {}
      return NextResponse.json({
        lat: Number(lat), lon: Number(lon), direccion: d.display_name ?? '', pais: a.country ?? 'Perú',
        departamento: a.state ?? a.region ?? '', provincia: a.province ?? a.county ?? '',
        distrito: a.city_district ?? a.town ?? a.city ?? a.suburb ?? a.village ?? '',
      })
    }
    if (q) {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pe&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`, { headers })
      const d = await r.json()
      const results = (Array.isArray(d) ? d : []).map((it: { lat: string; lon: string; display_name: string; address?: Record<string, string> }) => {
        const a = it.address ?? {}
        return {
          lat: Number(it.lat), lon: Number(it.lon), direccion: it.display_name, pais: a.country ?? 'Perú',
          departamento: a.state ?? a.region ?? '', provincia: a.province ?? a.county ?? '',
          distrito: a.city_district ?? a.town ?? a.city ?? a.suburb ?? a.village ?? '',
        }
      })
      return NextResponse.json(results)
    }
    return NextResponse.json({ error: 'Falta q o lat/lon' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Error de geocodificación' }, { status: 502 })
  }
}
