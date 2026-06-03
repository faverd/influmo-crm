import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { extractTextFromUrl, processPlainText, detectDocType } from '@/lib/document-processor'
import { embedDocument } from '@/lib/embed-document'

// Allow large uploads (up to 50MB)
export const maxDuration = 60
export const runtime = 'nodejs'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bot_documents')
    .select('id, name, type, file_path, original_url, file_size, chunk_count, status, error_message, created_at')
    .eq('bot_id', id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: Params) {
  const { id: botId } = await params
  const supabase = createServiceClient()
  const ct = req.headers.get('content-type') ?? ''

  // ── Text or URL ───────────────────────────────────────────────────────────
  if (ct.includes('application/json')) {
    const body = await req.json() as { type: 'text' | 'url'; name: string; content?: string; url?: string; category?: string }
    let rawContent = ''

    if (body.type === 'url' && body.url) {
      try { rawContent = await extractTextFromUrl(body.url) }
      catch (e) { return NextResponse.json({ error: `No se pudo acceder a la URL: ${e}` }, { status: 400 }) }
    } else if (body.content) {
      rawContent = processPlainText(body.content).text
    }

    if (!rawContent) return NextResponse.json({ error: 'Sin contenido' }, { status: 400 })

    const { data, error } = await supabase
      .from('bot_documents')
      .insert({
        bot_id: botId,
        name: body.name,
        type: body.type,
        original_url: body.url ?? null,
        raw_content: rawContent,
        file_size: rawContent.length,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-embed in background (non-blocking)
    embedDocument(botId, data.id).catch(() => {})

    return NextResponse.json(data, { status: 201 })
  }

  // ── File upload ───────────────────────────────────────────────────────────
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `El archivo supera el límite de 50 MB (${(file.size / 1048576).toFixed(1)} MB)` }, { status: 400 })
  }

  const docType = detectDocType(file.name)
  const buffer = Buffer.from(await file.arrayBuffer())

  // Sanitize filename for storage path (avoid spaces/special chars breaking the URL)
  const safeName = file.name.replace(/[^\w.\-]/g, '_')
  const storagePath = `${botId}/${Date.now()}-${safeName}`
  const { error: uploadErr } = await supabase.storage
    .from('bot-documents')
    .upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from('bot-documents').getPublicUrl(storagePath)

  const rawContent = (docType === 'txt' || docType === 'md' || docType === 'csv')
    ? new TextDecoder().decode(buffer) : ''

  const formCategory = (form.get('category') as string) || 'General'

  const { data, error } = await supabase
    .from('bot_documents')
    .insert({
      bot_id: botId,
      name: file.name,
      type: docType,
      file_path: storagePath,
      original_url: urlData.publicUrl,
      raw_content: rawContent || null,
      file_size: file.size,
      // Images don't get embedded (no text); mark ready immediately
      status: docType === 'image' ? 'ready' : 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-embed text documents in background (skip images)
  if (docType !== 'image') embedDocument(botId, data.id).catch(() => {})

  void formCategory
  return NextResponse.json(data, { status: 201 })
}
