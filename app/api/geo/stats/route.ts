import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { centroide, deptoCercano, type GeoZona, type GeoPoint } from '@/lib/geo'

function desdeRango(rango: string | null): Date | null {
  const now = new Date(); const d = new Date(now)
  switch (rango) {
    case 'hoy': d.setHours(0, 0, 0, 0); return d
    case 'ayer': d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d
    case 'semana': d.setDate(d.getDate() - 7); return d
    case 'mes': d.setMonth(d.getMonth() - 1); return d
    case 'trimestre': d.setMonth(d.getMonth() - 3); return d
    case 'anio': d.setFullYear(d.getFullYear() - 1); return d
    default: return null
  }
}
const isWon = (estado: unknown) => /aprob|acept|ganad|vendid|cerrad/i.test(String(estado || ''))
interface Row { [k: string]: unknown }

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const desde = sp.get('desde') ? new Date(sp.get('desde')!) : desdeRango(sp.get('rango'))
  const hasta = sp.get('hasta') ? new Date(sp.get('hasta')!) : null

  const sb = createServiceClient()
  const [ubic, cot, contactCount] = await Promise.all([
    sb.from('ubicaciones_comerciales').select('*').then(r => r.data ?? []),
    sb.from('cotizaciones').select('cliente_nombre,estado,total,created_at').then(r => r.data ?? []),
    sb.from('crm_contacts').select('id', { count: 'exact', head: true }).then(r => r.count ?? 0),
  ])

  const inRange = (iso: unknown) => {
    if (!desde && !hasta) return true
    if (!iso) return true
    const t = new Date(String(iso)).getTime()
    if (desde && t < desde.getTime()) return false
    if (hasta && t > hasta.getTime() + 86400000) return false
    return true
  }

  const zonas: Record<string, GeoZona> = {}
  const z = (dep: string): GeoZona => (zonas[dep] ??= { departamento: dep, contactos: 0, clientes: 0, cotizaciones: 0, ventas: 0, monto: 0, ubicaciones: 0, total: 0, pct: 0 })

  // Mapa nombre-cliente → departamento (para asignar cotizaciones a su zona)
  const clienteDep = new Map<string, string>()
  const clientesPorDep: Record<string, Set<string>> = {}

  for (const u of ubic as Row[]) {
    if (!inRange(u.created_at)) continue
    const la = Number(u.lat), lo = Number(u.lon)
    const dep = String(u.departamento || '').trim() || (Number.isFinite(la) && Number.isFinite(lo) ? deptoCercano(la, lo) ?? '' : '')
    if (!dep) continue
    z(dep).ubicaciones++
    const cli = String(u.cliente_nombre || u.cliente || '').trim()
    if (cli) { clienteDep.set(cli.toLowerCase(), dep); (clientesPorDep[dep] ??= new Set()).add(cli.toLowerCase()) }
    const nom = String(u.nombre || '').trim(); if (nom) clienteDep.set(nom.toLowerCase(), dep)
    if (u.tipo === 'cliente' && cli) { /* contado abajo por set */ }
  }
  for (const [dep, set] of Object.entries(clientesPorDep)) z(dep).clientes = set.size

  for (const q of cot as Row[]) {
    if (!inRange(q.created_at)) continue
    const dep = clienteDep.get(String(q.cliente_nombre || '').toLowerCase())
    if (!dep) continue
    const zona = z(dep)
    zona.cotizaciones++
    if (isWon(q.estado)) { zona.ventas++; zona.monto += Number(q.total) || 0 }
  }

  const list = Object.values(zonas)
  for (const zz of list) zz.total = zz.clientes + zz.contactos + zz.cotizaciones + zz.ubicaciones
  const totalAct = list.reduce((s, zz) => s + zz.total, 0) || 1
  for (const zz of list) {
    zz.pct = Math.round((zz.total / totalAct) * 1000) / 10
    const cc = centroide(zz.departamento); if (cc) { zz.lat = cc[0]; zz.lon = cc[1] }
  }
  list.sort((a, b) => b.total - a.total)

  const points: GeoPoint[] = []
  for (const u of ubic as Row[]) {
    const la = Number(u.lat), lo = Number(u.lon)
    if (Number.isFinite(la) && Number.isFinite(lo)) points.push({ lat: la, lon: lo, tipo: String(u.tipo || 'tienda'), nombre: String(u.nombre || ''), departamento: String(u.departamento || '') })
  }

  const totals = {
    contactos: contactCount as number,
    clientes: list.reduce((s, zz) => s + zz.clientes, 0),
    cotizaciones: list.reduce((s, zz) => s + zz.cotizaciones, 0),
    ventas: list.reduce((s, zz) => s + zz.ventas, 0),
    monto: list.reduce((s, zz) => s + zz.monto, 0),
  }

  return NextResponse.json({ totals, zonas: list, points })
}
