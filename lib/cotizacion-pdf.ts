import { jsPDF } from 'jspdf'

export interface CotItem { descripcion: string; cantidad: number; precio_unitario: number; unidad: string }
export interface CotizacionPdfData {
  numero: string
  fecha_emision: string
  cliente_nombre: string
  cliente_direccion?: string | null
  cliente_ruc?: string | null
  cliente_telefono?: string | null
  cliente_email?: string | null
  vendedor?: string | null
  contacto?: string | null
  cond_pago?: string | null
  validez?: string | null
  tiempo_entrega?: string | null
  lugar_entrega?: string | null
  garantia?: string | null
  ref_ubicacion?: string | null
  items: CotItem[]
  subtotal: number
  igv: number
  total: number
  moneda: string
  notas?: string | null
}

export interface CompanyBranding {
  logoUrl?: string
  empresa: string
  ruc: string
  telefono: string
  email: string
  direccion: string
  web: string
  terminos: string
  footerHtml?: string
  accent: string // hex
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0]
}

async function loadImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.width, h: img.height })
      img.onerror = () => resolve({ w: 1, h: 1 })
      img.src = data
    })
    return { data, w: dims.w, h: dims.h }
  } catch { return null }
}

function fmt(n: number, moneda: string) {
  const sym = moneda === 'USD' ? '$' : 'S/'
  return `${sym} ${n.toFixed(2)}`
}

export async function generateCotizacionPDF(cot: CotizacionPdfData, company: CompanyBranding): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, M = 14
  const [r, g, b] = hexToRgb(company.accent || '#0d9488')
  const DARK: [number, number, number] = [31, 41, 55]
  const GRAY: [number, number, number] = [107, 114, 128]

  // ── Header band ──
  doc.setFillColor(r, g, b)
  doc.rect(0, 0, W, 34, 'F')

  const logo = company.logoUrl ? await loadImage(company.logoUrl) : null
  if (logo) {
    const maxW = 46, maxH = 16
    const ratio = logo.w / logo.h
    let lw = maxW, lh = maxW / ratio
    if (lh > maxH) { lh = maxH; lw = maxH * ratio }
    doc.addImage(logo.data, 'PNG', M, 9, lw, lh)
  } else {
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
    doc.text(company.empresa || 'Mi Empresa', M, 21)
  }

  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17)
  doc.text('COTIZACIÓN', W - M, 15, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(cot.numero, W - M, 21, { align: 'right' })
  doc.text(`Fecha: ${cot.fecha_emision}`, W - M, 26, { align: 'right' })

  // ── Info table ──
  let y = 42
  const rowH = 7.2
  const colSplit = W / 2

  function infoRow(items: { label: string; value: string; x: number; w: number }[]) {
    doc.setDrawColor(229, 231, 235)
    doc.rect(M, y, W - M * 2, rowH)
    if (items.length > 1) doc.line(colSplit, y, colSplit, y + rowH)
    for (const it of items) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...DARK)
      const labelW = doc.getTextWidth(`${it.label}: `)
      doc.text(`${it.label}:`, it.x + 3, y + rowH / 2 + 1.2)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
      doc.text(it.value || '—', it.x + 3 + labelW + 1, y + rowH / 2 + 1.2)
    }
    y += rowH
  }

  infoRow([{ label: 'Señores', value: cot.cliente_nombre, x: M, w: W - M * 2 }])
  infoRow([{ label: 'Dirección', value: cot.cliente_direccion || '', x: M, w: W - M * 2 }])
  infoRow([
    { label: 'R.U.C.', value: cot.cliente_ruc || '', x: M, w: colSplit - M },
    { label: 'Teléfono', value: cot.cliente_telefono || '', x: colSplit, w: (W - M) - colSplit },
  ])
  infoRow([
    { label: 'Vendedor', value: cot.vendedor || '', x: M, w: colSplit - M },
    { label: 'Contacto', value: cot.contacto || '', x: colSplit, w: (W - M) - colSplit },
  ])
  infoRow([
    { label: 'Email', value: cot.cliente_email || '', x: M, w: colSplit - M },
    { label: 'Cond. de Pago', value: cot.cond_pago || '', x: colSplit, w: (W - M) - colSplit },
  ])
  infoRow([
    { label: 'Validez', value: cot.validez || '', x: M, w: colSplit - M },
    { label: 'Tiempo entrega', value: cot.tiempo_entrega || '', x: colSplit, w: (W - M) - colSplit },
  ])
  infoRow([
    { label: 'Lugar entrega', value: cot.lugar_entrega || '', x: M, w: colSplit - M },
    { label: 'Garantía', value: cot.garantia || '', x: colSplit, w: (W - M) - colSplit },
  ])
  if (cot.ref_ubicacion) infoRow([{ label: 'Ref. Ubicación', value: cot.ref_ubicacion, x: M, w: W - M * 2 }])

  // ── Items table ──
  y += 4
  const colX = { item: M, desc: M + 10, und: M + 108, cant: M + 128, punit: M + 148, importe: W - M - 30 }
  const colW = W - M * 2

  doc.setFillColor(r, g, b)
  doc.rect(M, y, colW, 7, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text('ITEM', colX.item + 2, y + 4.8)
  doc.text('Descripción', colX.desc, y + 4.8)
  doc.text('Und.', colX.und, y + 4.8)
  doc.text('Cant.', colX.cant, y + 4.8)
  doc.text('P. Unit.', colX.punit, y + 4.8, { align: 'left' })
  doc.text('Importe', W - M - 3, y + 4.8, { align: 'right' })
  y += 7

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  cot.items.forEach((it, i) => {
    const lineH = 7
    if (i % 2 === 1) { doc.setFillColor(249, 250, 251); doc.rect(M, y, colW, lineH, 'F') }
    doc.setTextColor(...DARK)
    doc.text(String(i + 1), colX.item + 2, y + 4.8)
    doc.text(it.descripcion || '', colX.desc, y + 4.8, { maxWidth: 92 })
    doc.text(it.unidad || '', colX.und, y + 4.8)
    doc.text(String(it.cantidad), colX.cant, y + 4.8)
    doc.text(fmt(it.precio_unitario, cot.moneda), colX.punit, y + 4.8)
    doc.text(fmt(it.cantidad * it.precio_unitario, cot.moneda), W - M - 3, y + 4.8, { align: 'right' })
    y += lineH
  })
  doc.setDrawColor(229, 231, 235)
  doc.rect(M, y - cot.items.length * 7 - 7, colW, cot.items.length * 7 + 7)

  // ── Totals ──
  y += 4
  const totX = W - M - 70
  doc.setFontSize(9)
  doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal')
  doc.text('Subtotal', totX, y); doc.text(fmt(cot.subtotal, cot.moneda), W - M - 3, y, { align: 'right' })
  y += 5.5
  doc.text('IGV (18%)', totX, y); doc.text(fmt(cot.igv, cot.moneda), W - M - 3, y, { align: 'right' })
  y += 6.5
  doc.setDrawColor(...[r, g, b] as [number, number, number])
  doc.setLineWidth(0.6); doc.line(totX, y - 4.5, W - M - 3, y - 4.5)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(r, g, b)
  doc.text('TOTAL', totX, y); doc.text(fmt(cot.total, cot.moneda), W - M - 3, y, { align: 'right' })

  // ── Observaciones / Términos ──
  y += 10
  if (cot.notas) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK)
    doc.text('Observaciones', M, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY)
    const lines = doc.splitTextToSize(cot.notas, colW)
    doc.text(lines, M, y); y += lines.length * 4.2 + 4
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK)
  doc.text('Términos y condiciones', M, y); y += 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  const termLines = doc.splitTextToSize(company.terminos || '', colW)
  doc.text(termLines, M, y); y += termLines.length * 4 + 6

  // ── Footer (company info + bank accounts) ──
  const footerBandY = 282
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(r, g, b)
  doc.text((company.empresa || '').toUpperCase(), M, footerBandY - 14)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3); doc.setTextColor(...GRAY)
  doc.text(`RUC: ${company.ruc || '—'} · ${company.direccion || ''}`, M, footerBandY - 10)
  doc.text(`${company.telefono || ''} · ${company.email || ''} · ${company.web || ''}`, M, footerBandY - 6.5)

  if (company.footerHtml) {
    const stripped = company.footerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const bankLines = doc.splitTextToSize(stripped, 70)
    doc.setFontSize(7); doc.text(bankLines, W - M, footerBandY - 14, { align: 'right' })
  }

  // Bottom brand band
  doc.setFillColor(r, g, b)
  doc.rect(0, footerBandY, W, 15, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
  doc.text('Gracias por su preferencia.', W / 2, footerBandY + 6.5, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
  doc.text(`Diseño y decoración de interiores · ${company.web || ''}`, W / 2, footerBandY + 11, { align: 'center' })

  return doc
}
