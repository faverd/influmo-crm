import { jsPDF } from 'jspdf'

export interface FieldPdfData {
  crop: string
  cropEmoji?: string
  hectares: number
  areaM2: number
  stage?: string
  productionTons: number
  sacks: number
  sackKg: number
  waterM3: number
  plants: number
  recommendation: string
  logoUrl?: string                       // platform-uploaded logo
  docs?: { name: string; url: string }[] // technical sheets to list/link
}

const BRAND: [number, number, number] = [22, 163, 74]
const DARK: [number, number, number] = [17, 24, 39]
const GRAY: [number, number, number] = [107, 114, 128]
const LIGHT: [number, number, number] = [240, 253, 244]

async function loadImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const data: string = await new Promise(resolve => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result as string)
      r.onerror = () => resolve('')
      r.readAsDataURL(blob)
    })
    if (!data) return null
    // Get natural dimensions to preserve aspect ratio
    const dims: { w: number; h: number } = await new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => resolve({ w: 4, h: 1 })
      img.src = data
    })
    return { data, w: dims.w, h: dims.h }
  } catch { return null }
}

// Remove emojis / non-Latin glyphs that jsPDF's helvetica can't render
function stripEmoji(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2190}-\u{27BF}]/gu, '')
    .replace(/[\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/✓|✔|●|■|◦|▪/g, '-')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

interface Parsed {
  blocks: ({ type: 'h'; text: string } | { type: 'p'; text: string } | { type: 'li'; text: string } | { type: 'table'; rows: string[][] })[]
}

function parseRecommendation(md: string): Parsed {
  const lines = md.split('\n')
  const blocks: Parsed['blocks'] = []
  let tableRows: string[][] | null = null

  const flushTable = () => { if (tableRows && tableRows.length) blocks.push({ type: 'table', rows: tableRows }); tableRows = null }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const isRow = /^\s*\|.*\|\s*$/.test(line)
    const isSep = /^\s*\|[\s:|-]+\|\s*$/.test(line)
    if (isSep) continue
    if (isRow) {
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => stripEmoji(c.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '')).trim())
      if (!tableRows) tableRows = []
      tableRows.push(cells)
      continue
    }
    flushTable()
    if (!line.trim()) continue
    const hMatch = line.match(/^#{1,4}\s*(.+)$/)
    if (hMatch) { blocks.push({ type: 'h', text: stripEmoji(hMatch[1].replace(/\*\*/g, '')) }); continue }
    const liMatch = line.match(/^[-*]\s+(.+)$/)
    if (liMatch) { blocks.push({ type: 'li', text: stripEmoji(liMatch[1].replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '')) }); continue }
    blocks.push({ type: 'p', text: stripEmoji(line.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '')) })
  }
  flushTable()
  return { blocks }
}

export async function generateFieldPDF(data: FieldPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, H = 297, M = 16
  // Prefer platform-uploaded logo, fallback to bundled BERAGRO logo
  const logo = await loadImage(data.logoUrl || '/beragro-logo.png') || await loadImage('/beragro-logo.png')
  const footerY = H - 22

  // ── Header ──
  if (logo) {
    const maxW = 48, maxH = 16
    const ratio = logo.w / logo.h
    let lw = maxW, lh = maxW / ratio
    if (lh > maxH) { lh = maxH; lw = maxH * ratio }
    doc.addImage(logo.data, 'PNG', M, 11, lw, lh)
  } else {
    doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('BERAGRO', M, 20)
  }

  doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text('RECETARIO AGRONOMICO', W - M, 17, { align: 'right' })
  doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }), W - M, 23, { align: 'right' })

  doc.setDrawColor(...BRAND); doc.setLineWidth(0.8); doc.line(M, 30, W - M, 30)
  let y = 38

  // ── Summary card ──
  doc.setFillColor(...LIGHT); doc.roundedRect(M, y, W - 2 * M, 30, 3, 3, 'F')
  doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text(`Cultivo: ${stripEmoji(data.crop)}`, M + 5, y + 9)
  if (data.stage) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRAY); doc.text(`Etapa: ${data.stage}`, M + 5, y + 15.5) }

  const stats = [
    [`${data.hectares.toFixed(2)} ha`, 'Area'],
    [`${data.productionTons.toFixed(1)} t`, 'Produccion'],
    [data.sacks > 0 ? `${data.sacks} sacos` : '-', `Sacos ${data.sackKg}kg`],
    [data.waterM3 > 0 ? `${data.waterM3.toLocaleString()} m3` : '-', 'Agua'],
  ]
  const colW = (W - 2 * M - 10) / 4
  stats.forEach(([v, l], i) => {
    const sx = M + 5 + i * colW
    doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(String(v), sx, y + 25)
    doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(String(l), sx, y + 28.5)
  })
  y += 38

  // ── Body ──
  const parsed = parseRecommendation(data.recommendation)

  const ensureSpace = (need: number) => {
    if (y + need > footerY - 4) { drawFooter(doc, W, H, M); doc.addPage(); y = 22 }
  }

  for (const block of parsed.blocks) {
    if (block.type === 'h') {
      ensureSpace(9)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND); doc.setFontSize(11)
      doc.text(block.text, M, y); y += 6.5
    } else if (block.type === 'li') {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK); doc.setFontSize(9.5)
      const wrapped = doc.splitTextToSize(`•  ${block.text}`, W - 2 * M - 2)
      ensureSpace(wrapped.length * 5)
      doc.text(wrapped, M + 2, y); y += wrapped.length * 5 + 1
    } else if (block.type === 'p') {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK); doc.setFontSize(9.5)
      const wrapped = doc.splitTextToSize(block.text, W - 2 * M)
      ensureSpace(wrapped.length * 5)
      doc.text(wrapped, M, y); y += wrapped.length * 5 + 2
    } else if (block.type === 'table') {
      y = drawTable(doc, block.rows, M, y, W - 2 * M, () => ensureSpace(10)) + 4
    }
  }

  // ── Fichas técnicas (clickable download links) ──
  if (data.docs && data.docs.length) {
    ensureSpace(14)
    y += 2
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND); doc.setFontSize(11)
    doc.text('Fichas tecnicas (toca para descargar)', M, y); y += 7
    for (const d of data.docs) {
      ensureSpace(8)
      // Document icon box
      doc.setFillColor(...LIGHT); doc.roundedRect(M, y - 4, W - 2 * M, 8, 1.5, 1.5, 'F')
      doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text('PDF', M + 3, y + 1.2)
      doc.setTextColor(37, 99, 235); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      const name = stripEmoji(d.name)
      doc.textWithLink(name, M + 14, y + 1.2, { url: d.url })
      // "Descargar" hint on the right
      doc.setTextColor(...GRAY); doc.setFontSize(7.5)
      doc.textWithLink('Descargar >', W - M - 22, y + 1.2, { url: d.url })
      y += 10
    }
  }

  drawFooter(doc, W, H, M)
  return doc
}

// Draw an Excel-style table with borders
function drawTable(doc: jsPDF, rows: string[][], x: number, startY: number, totalW: number, ensureSpace: () => void): number {
  if (!rows.length) return startY
  const cols = Math.max(...rows.map(r => r.length))
  const colW = totalW / cols
  const pad = 1.8
  let y = startY

  rows.forEach((row, ri) => {
    const isHeader = ri === 0
    doc.setFont('helvetica', isHeader ? 'bold' : 'normal')
    doc.setFontSize(8)
    // Compute row height from wrapped cells
    const wrapped = Array.from({ length: cols }, (_, ci) =>
      doc.splitTextToSize(row[ci] ?? '', colW - 2 * pad))
    const rowH = Math.max(6, ...wrapped.map(w => w.length * 3.6 + 2.5))

    ensureSpace()
    // Header fill
    if (isHeader) { doc.setFillColor(...BRAND); doc.rect(x, y, totalW, rowH, 'F') }
    else if (ri % 2 === 0) { doc.setFillColor(247, 250, 248); doc.rect(x, y, totalW, rowH, 'F') }

    // Cell borders + text
    doc.setDrawColor(210, 215, 220); doc.setLineWidth(0.2)
    for (let ci = 0; ci < cols; ci++) {
      const cx = x + ci * colW
      doc.rect(cx, y, colW, rowH)
      doc.setTextColor(...(isHeader ? [255, 255, 255] as [number, number, number] : DARK))
      doc.text(wrapped[ci], cx + pad, y + 4)
    }
    y += rowH
  })
  return y
}

function drawFooter(doc: jsPDF, W: number, H: number, M: number) {
  const y = H - 16
  doc.setDrawColor(...BRAND); doc.setLineWidth(0.5); doc.line(M, y, W - M, y)
  doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text('BERAGRO  ·  Nanotecnologia Vegetal', M, y + 5)
  doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text('www.beragro.pe   |   info@beragro.pe   |   919 038 189', M, y + 9.5)
  doc.setFontSize(6.5); doc.setTextColor(160, 160, 160)
  doc.text('Documento generado automaticamente. Dosis referenciales, consulte a su asesor tecnico.', M, y + 13)
}
