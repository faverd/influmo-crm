// Document text extraction and chunking for RAG

export interface ProcessedDocument {
  text: string
  chunks: string[]
}

// ── Text chunking ─────────────────────────────────────────────────────────────

const CHUNK_SIZE    = 800  // characters per chunk
const CHUNK_OVERLAP = 150  // overlap between consecutive chunks

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!cleaned) return []

  const chunks: string[] = []
  let start = 0

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length)
    let slice = cleaned.slice(start, end)

    // Prefer to break at paragraph boundary
    if (end < cleaned.length) {
      const paraBreak = slice.lastIndexOf('\n\n')
      const sentBreak = slice.lastIndexOf('. ')
      const breakAt    = paraBreak > 400 ? paraBreak : sentBreak > 400 ? sentBreak + 1 : slice.length
      slice = slice.slice(0, breakAt).trim()
    }

    if (slice.length > 50) chunks.push(slice)
    start += slice.length - CHUNK_OVERLAP
    if (start >= cleaned.length) break
  }

  return chunks
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

export function detectDocType(filename: string): 'pdf' | 'docx' | 'xlsx' | 'txt' | 'url' | 'text' {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf')            return 'pdf'
  if (ext === 'docx' || ext === 'doc') return 'docx'
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
  if (ext === 'txt')            return 'txt'
  return 'txt'
}

// ── File size formatter ───────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
