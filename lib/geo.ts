// Módulo Geolocalización Comercial — catálogos y utilidades (adaptado para decoración)

export const UBICACION_COLS = [
  'nombre', 'tipo', 'cliente', 'cliente_nombre', 'direccion', 'ciudad',
  'pais', 'departamento', 'provincia', 'distrito', 'lat', 'lon',
  'responsable', 'telefono', 'estado',
]

export const UBICACION_TIPOS = [
  { id: 'tienda',      label: 'Tienda',         color: '#16a34a', icon: '🏪' },
  { id: 'sucursal',    label: 'Sucursal',       color: '#2563eb', icon: '🏢' },
  { id: 'punto_venta', label: 'Punto de venta', color: '#d97706', icon: '📍' },
  { id: 'almacen',     label: 'Almacén',        color: '#7c3aed', icon: '📦' },
  { id: 'cliente',     label: 'Cliente',        color: '#0d9488', icon: '👤' },
]

export const UBICACION_ESTADOS = [
  { id: 'activo',    label: 'Activo',    cls: 'bg-green-50 text-green-600' },
  { id: 'inactivo',  label: 'Inactivo',  cls: 'bg-gray-100 text-gray-500' },
  { id: 'prospecto', label: 'Prospecto', cls: 'bg-amber-50 text-amber-600' },
]

export type RangoId = 'hoy' | 'ayer' | 'semana' | 'mes' | 'trimestre' | 'anio' | 'todo'
export const RANGOS: { id: RangoId; label: string }[] = [
  { id: 'hoy', label: 'Hoy' }, { id: 'ayer', label: 'Ayer' }, { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' }, { id: 'trimestre', label: 'Trimestre' }, { id: 'anio', label: 'Año' },
  { id: 'todo', label: 'Todo' },
]

export const DEPARTAMENTOS_PE: Record<string, [number, number]> = {
  'Amazonas': [-5.20, -78.10], 'Áncash': [-9.53, -77.53], 'Ancash': [-9.53, -77.53],
  'Apurímac': [-14.05, -73.09], 'Apurimac': [-14.05, -73.09], 'Arequipa': [-16.40, -71.53],
  'Ayacucho': [-13.16, -74.22], 'Cajamarca': [-7.16, -78.51], 'Callao': [-12.05, -77.12],
  'Cusco': [-13.53, -71.97], 'Cuzco': [-13.53, -71.97], 'Huancavelica': [-12.79, -74.97],
  'Huánuco': [-9.93, -76.24], 'Huanuco': [-9.93, -76.24], 'Ica': [-14.07, -75.73],
  'Junín': [-11.16, -75.99], 'Junin': [-11.16, -75.99], 'La Libertad': [-8.11, -78.74],
  'Lambayeque': [-6.71, -79.91], 'Lima': [-12.05, -77.04], 'Loreto': [-4.00, -75.00],
  'Madre de Dios': [-12.59, -69.18], 'Moquegua': [-17.19, -70.93], 'Pasco': [-10.68, -76.26],
  'Piura': [-5.19, -80.63], 'Puno': [-15.84, -70.02], 'San Martín': [-6.49, -76.37],
  'San Martin': [-6.49, -76.37], 'Tacna': [-18.01, -70.25], 'Tumbes': [-3.57, -80.46],
  'Ucayali': [-8.38, -74.55],
}

export function centroide(departamento: string): [number, number] | null {
  if (!departamento) return null
  return DEPARTAMENTOS_PE[departamento.trim()] ?? null
}

export function deptoCercano(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  let best: string | null = null, bestD = Infinity
  for (const [dep, [dlat, dlon]] of Object.entries(DEPARTAMENTOS_PE)) {
    const d = (dlat - lat) ** 2 + (dlon - lon) ** 2
    if (d < bestD) { bestD = d; best = dep }
  }
  return bestD < 9 ? best : null
}

export function escalaColor(frac: number): string {
  const f = Math.max(0, Math.min(1, frac))
  if (f <= 0.001) return '#e5edff'
  if (f < 0.25) return '#bfdbfe'
  if (f < 0.5) return '#93c5fd'
  if (f < 0.75) return '#3b82f6'
  return '#1d4ed8'
}

export interface GeoPoint { lat: number; lon: number; tipo: string; nombre: string; departamento?: string; valor?: number }
export interface GeoZona {
  departamento: string; contactos: number; clientes: number; cotizaciones: number
  ventas: number; monto: number; ubicaciones: number; total: number; pct: number; lat?: number; lon?: number
}
export interface GeoStats {
  totals: { contactos: number; clientes: number; cotizaciones: number; ventas: number; monto: number }
  zonas: GeoZona[]
  points: GeoPoint[]
}
