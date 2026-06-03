// Document text extraction and chunking for RAG
// pdf-parse v1.x exports a function directly
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse')

export interface ProcessedDocument {
  text: string
  chunks: string[]
}

// ── Text chunking ─────────────────────────────────────────────────────────────

const CHUNK_SIZE    = 800  // characters per chunk
const CHUNK_OVERLAP = 150  // overlap between consecutive chunks

const MAX_CHUNKS = 200  // safety cap

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
  if (!cleaned) return []

  const chunks: string[] = []
  const step = Math.max(1, CHUNK_SIZE - CHUNK_OVERLAP)  // always > 0 → guaranteed progress
  let start = 0

  while (start < cleaned.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length)
    const slice = cleaned.slice(start, end).trim()
    if (slice.length > 30) chunks.push(slice)
    start += step
  }

  return chunks
}

// ── PDF text extraction ───────────────────────────────────────────────────────

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Limit to first 30 pages to avoid memory issues on large PDFs
  const data = await (pdfParse as (b: Buffer, o?: { max?: number }) => Promise<{ text: string }>)(buffer, { max: 30 })
  return (data.text ?? '').trim()
}

// ── URL scraping ──────────────────────────────────────────────────────────────

export async function extractTextFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BotIA/1.0)' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)

  const html = await res.text()
  return stripHtml(html)
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ── Plain text ────────────────────────────────────────────────────────────────

export function processPlainText(text: string): ProcessedDocument {
  const cleaned = text.replace(/\r\n/g, '\n').trim()
  return { text: cleaned, chunks: chunkText(cleaned) }
}

// ── File type detection ───────────────────────────────────────────────────────

export function detectDocType(filename: string): 'pdf' | 'docx' | 'xlsx' | 'txt' | 'url' | 'text' | 'image' | 'md' | 'csv' {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf')            return 'pdf'
  if (ext === 'docx' || ext === 'doc') return 'docx'
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
  if (ext === 'md')             return 'md'
  if (ext === 'csv')            return 'csv'
  if (ext === 'txt')            return 'txt'
  if (['jpg','jpeg','png','webp','gif','bmp','svg'].includes(ext ?? '')) return 'image'
  return 'txt'
}

// ── File size formatter ───────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
