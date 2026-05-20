import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createEmbedding } from '@/lib/ai-providers'
import { chunkText, extractTextFromUrl } from '@/lib/document-processor'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { id: botId } = await params
  const { documentId } = await req.json() as { documentId: string }

  const supabase = createServiceClient()

  // Load bot + document
  const [{ data: bot }, { data: doc }] = await Promise.all([
    supabase.from('bots').select('api_key, embedding_key, provider').eq('id', botId).single(),
    supabase.from('bot_documents').select('*').eq('id', documentId).single(),
  ])

  if (!bot || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const embKey = bot.embedding_key || (bot.provider === 'openai' ? bot.api_key : '')
  if (!embKey) {
    return NextResponse.json(
      { error: 'Se requiere una API Key de OpenAI para crear embeddings. Configúrala en el panel del bot.' },
      { status: 400 }
    )
  }

  // Mark processing
  await supabase.from('bot_documents').update({ status: 'processing' }).eq('id', documentId)

  try {
    // Resolve text content
    let text = doc.raw_content ?? ''

    if (!text && doc.file_path) {
      // Try to get text from storage URL (works for .txt files)
      const { data: fileData } = supabase.storage
        .from('bot-documents')
        .getPublicUrl(doc.file_path)

      if (doc.type === 'txt') {
        const res = await fetch(fileData.publicUrl)
        text = await res.text()
      } else {
        // PDF/DOCX without text extraction: inform the user
        throw new Error(
          'Para archivos PDF/DOCX, por favor ingresa el texto manualmente usando el tipo "Texto" o copia el contenido directamente.'
        )
      }
    }

    if (!text && doc.original_url) {
      text = await extractTextFromUrl(doc.original_url)
    }

    if (!text) throw new Error('No se encontró texto para procesar')

    // Chunk text
    const chunks = chunkText(text)
    if (!chunks.length) throw new Error('El documento no generó fragmentos de texto')

    // Delete existing chunks for this document
    await supabase.from('bot_chunks').delete().eq('document_id', documentId)

    // Create embeddings in batches of 10
    const BATCH = 10
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH)
      const embeddings = await Promise.all(batch.map(chunk => createEmbedding(chunk, embKey)))

      const rows = batch.map((content, j) => ({
        document_id:  documentId,
        bot_id:       botId,
        content,
        embedding:    embeddings[j],
        chunk_index:  i + j,
      }))

      const { error } = await supabase.from('bot_chunks').insert(rows)
      if (error) throw new Error(error.message)
    }

    // Update document status
    await supabase
      .from('bot_documents')
      .update({
        status:      'ready',
        chunk_count: chunks.length,
        raw_content: text.slice(0, 10_000), // store first 10k chars for preview
      })
      .eq('id', documentId)

    return NextResponse.json({ success: true, chunks: chunks.length })
  } catch (err) {
    await supabase
      .from('bot_documents')
      .update({ status: 'error', error_message: String(err) })
      .eq('id', documentId)

    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
