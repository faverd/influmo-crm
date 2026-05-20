import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { extractTextFromUrl, processPlainText, detectDocType } from '@/lib/document-processor'

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

  // ── Manual text or URL ────────────────────────────────────────────────────
  if (ct.includes('application/json')) {
    const body = await req.json() as {
      type: 'text' | 'url'
      name: string
      content?: string
      url?: string
    }

    let rawContent = ''
    let docType: string = body.type

    if (body.type === 'url' && body.url) {
      try {
        rawContent = await extractTextFromUrl(body.url)
      } catch (e) {
        return NextResponse.json({ error: `No se pudo acceder a la URL: ${e}` }, { status: 400 })
      }
    } else if (body.content) {
      const processed = processPlainText(body.content)
      rawContent = processed.text
    }

    if (!rawContent) return NextResponse.json({ error: 'Sin contenido' }, { status: 400 })

    const { data, error } = await supabase
      .from('bot_documents')
      .insert({
        bot_id: botId,
        name: body.name,
        type: docType,
        original_url: body.url ?? null,
        raw_content: rawContent,
        file_size: rawContent.length,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  // ── File upload ───────────────────────────────────────────────────────────
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const docType = detectDocType(file.name)
  const buffer  = Buffer.from(await file.arrayBuffer())

  // Upload to Supabase Storage
  const storagePath = `${botId}/${Date.now()}-${file.name}`
  const { error: uploadErr } = await supabase.storage
    .from('bot-documents')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  // Extract text for txt files directly; others need the embed step
  let rawContent = ''
  if (docType === 'txt') {
    rawContent = new TextDecoder().decode(buffer)
  }

  const { data, error } = await supabase
    .from('bot_documents')
    .insert({
      bot_id: botId,
      name: file.name,
      type: docType,
      file_path: storagePath,
      raw_content: rawContent || null,
      file_size: file.size,
      status: rawContent ? 'pending' : 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
