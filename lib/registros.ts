// Catálogos y utilidades del módulo Registros (Empresas / Clientes)

export const EMPRESA_COLS = [
  'razon_social', 'nombre_comercial', 'ruc', 'tipo_empresa', 'sector_productivo', 'estado', 'fecha_registro',
  'pais', 'departamento', 'provincia', 'distrito', 'direccion', 'codigo_postal', 'coordenadas',
  'tipo_cultivo', 'cultivos_principales', 'hectareas_totales', 'hectareas_productivas', 'tipo_riego', 'certificaciones',
  'mercado_objetivo', 'volumen_anual', 'exporta',
  'facturacion_anual', 'moneda', 'categoria_cliente',
  'contacto_nombre', 'contacto_cargo', 'contacto_telefono', 'contacto_whatsapp', 'contacto_email',
]

export const CONTACTO_COLS = [
  'nombre_completo', 'documento', 'tipo_documento', 'fecha_nacimiento', 'genero',
  'cargo', 'empresa_id', 'empresa_nombre', 'profesion',
  'email', 'telefono', 'whatsapp', 'linkedin', 'sitio_web',
  'pais', 'departamento', 'provincia', 'distrito', 'direccion',
  'estado', 'intereses',
]

export const CATEGORIA_CLIENTE = [
  { id: 'prospecto',   label: 'Prospecto',        cls: 'bg-gray-100 text-gray-600' },
  { id: 'cliente',     label: 'Cliente',          cls: 'bg-blue-50 text-blue-600' },
  { id: 'premium',     label: 'Cliente Premium',  cls: 'bg-amber-50 text-amber-600' },
  { id: 'distribuidor',label: 'Distribuidor',     cls: 'bg-violet-50 text-violet-600' },
  { id: 'proveedor',   label: 'Proveedor',        cls: 'bg-teal-50 text-teal-600' },
]
export const EMPRESA_ESTADOS = [
  { id: 'activo',    label: 'Activo',    cls: 'bg-green-50 text-green-600' },
  { id: 'inactivo',  label: 'Inactivo',  cls: 'bg-gray-100 text-gray-500' },
]
export const TIPO_EMPRESA = ['Empresa', 'Constructora', 'Estudio de Arquitectura', 'Inmobiliaria', 'Hotel / Restaurante', 'Distribuidor', 'Otro']
export const SECTORES = ['Residencial', 'Corporativo', 'Comercial', 'Hotelería', 'Retail', 'Institucional', 'Mixto']
export const TIPO_RIEGO = ['—']
export const CERTIFICACIONES = ['Premium', 'Eco / Sostenible', 'Importado', 'Nacional', 'Otras']
export const MONEDAS = ['PEN', 'USD', 'EUR']

export const TIPO_DOCUMENTO = ['DNI', 'CE', 'Pasaporte', 'RUC']
export const GENEROS = ['Masculino', 'Femenino', 'Otro']
export const PROFESIONES = ['Arquitecto', 'Diseñador de Interiores', 'Constructor', 'Decorador', 'Ingeniero', 'Consultor', 'Otro']
export const CONTACTO_ESTADOS = [
  { id: 'prospecto',   label: 'Prospecto',   cls: 'bg-gray-100 text-gray-600' },
  { id: 'contactado',  label: 'Contactado',  cls: 'bg-blue-50 text-blue-600' },
  { id: 'negociacion', label: 'Negociación', cls: 'bg-amber-50 text-amber-600' },
  { id: 'cliente',     label: 'Cliente',     cls: 'bg-green-50 text-green-600' },
  { id: 'inactivo',    label: 'Inactivo',    cls: 'bg-gray-100 text-gray-400' },
]
export const INTERESES = ['Cortinas', 'Persianas', 'Papel tapiz', 'Pisos', 'Tapizado', 'Muebles', 'Iluminación', 'Cojines', 'Alfombras', 'Decoración integral']

export const findOpt = (arr: { id: string; label: string; cls?: string }[], id: string) =>
  arr.find(o => o.id === id) ?? arr[0]

// Exporta filas a PDF (jsPDF cargado dinámicamente, solo en cliente)
export async function exportPdf(title: string, rows: Record<string, unknown>[], headers: { key: string; label: string }[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 28
  const colW = (pageW - margin * 2) / headers.length
  doc.setFontSize(14); doc.setTextColor(30)
  doc.text(title, margin, 34)
  doc.setFontSize(8); doc.setTextColor(120)
  doc.text(new Date().toLocaleString('es-PE'), margin, 48)

  let y = 70
  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s
  doc.setFillColor(30, 30, 30); doc.setTextColor(255); doc.setFontSize(8)
  doc.rect(margin, y - 11, pageW - margin * 2, 16, 'F')
  headers.forEach((h, i) => doc.text(trunc(h.label, 22), margin + 4 + i * colW, y))
  y += 14
  doc.setTextColor(40)
  rows.forEach((r, idx) => {
    if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 50 }
    if (idx % 2 === 0) { doc.setFillColor(245, 248, 250); doc.rect(margin, y - 10, pageW - margin * 2, 15, 'F') }
    headers.forEach((h, i) => doc.text(trunc(String(r[h.key] ?? ''), 26), margin + 4 + i * colW, y))
    y += 15
  })
  doc.save(title.toLowerCase().replace(/\s+/g, '_') + '.pdf')
}

// Exporta filas a CSV (compatible con Excel)
export function exportCsv(filename: string, rows: Record<string, unknown>[], headers: { key: string; label: string }[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = headers.map(h => esc(h.label)).join(',')
  const body = rows.map(r => headers.map(h => esc(r[h.key])).join(',')).join('\n')
  const csv = '﻿' + head + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
