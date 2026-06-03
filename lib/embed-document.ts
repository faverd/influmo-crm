// Core embedding logic — used by both upload and manual re-index
import { createServiceClient } from '@/lib/supabase/server'
import { createEmbedding } from '@/lib/ai-providers'
import { chunkText, extractTextFromPdf, extractTextFromUrl } from '@/lib/document-processor'

function sanitizeText(t: string): string {
  return t
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1")
    .replace(/\uFFFD/g, "")
}

export async function embedDocument(
  botId: string,
  documentId: string
): Promise<{ chunks: number } | { error: string }> {
  const supabase = createServiceClient()

  const [{ data: bot }, { data: doc }] = await Promise.all([
    supabase.from('bots').select('api_key, embedding_key, provider').eq('id', botId).single(),
    supabase.from('bot_documents').select('*').eq('id', documentId).single(),
  ])

  if (!bot || !doc) return { error: 'Bot o documento no encontrado' }

  const embKey = bot.embedding_key || (bot.provider === 'openai' ? bot.api_key : '')
  if (!embKey) return { error: 'Se requiere API Key de OpenAI para crear embeddings' }

  await supabase.from('bot_documents').update({ status: 'processing', error_message: null }).eq('id', documentId)

  try {
    let text = doc.raw_content ?? ''

    // Extract text from source if not already stored
    if (!text && doc.file_path) {
      const { data: urlData } = supabase.storage.from('bot-documents').getPublicUrl(doc.file_path)
      const res = await fetch(urlData.publicUrl)
      if (!res.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${res.status})`)
      if (doc.type === 'pdf') {
        const buffer = Buffer.from(await res.arrayBuffer())
        text = await extractTextFromPdf(buffer)
      } else {
        text = await res.text()
      }
    }

    if (!text && doc.original_url && doc.type === 'url') {
      text = await extractTextFromUrl(doc.original_url)
    }

    text = sanitizeText(text || '')

    if (!text.trim()) throw new Error('Este PDF no contiene texto extraíble (puede ser una presentación con imágenes o un escaneo).')

    const chunks = chunkText(text)
    if (!chunks.length) throw new Error('El documento no generó fragmentos de texto procesables')

    // Delete existing chunks
    await supabase.from('bot_chunks').delete().eq('document_id', documentId)

    // Create embeddings in batches of 10
    const BATCH = 10
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH)
      const embeddings = await Promise.all(batch.map(chunk => createEmbedding(chunk, embKey)))
      const rows = batch.map((content, j) => ({
        document_id: documentId,
        bot_id: botId,
        content,
        embedding: embeddings[j],
        chunk_index: i + j,
      }))
      const { error } = await supabase.from('bot_chunks').insert(rows)
      if (error) throw new Error(error.message)
    }

    await supabase.from('bot_documents').update({
      status: 'ready',
      chunk_count: chunks.length,
      raw_content: text.slice(0, 50_000),
    }).eq('id', documentId)

    return { chunks: chunks.length }
  } catch (err) {
    await supabase.from('bot_documents').update({
      status: 'error',
      error_message: String(err),
    }).eq('id', documentId)
    return { error: String(err) }
  }
}
