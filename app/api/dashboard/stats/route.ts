import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createServiceClient()

  const [bots, docs, contacts, convos, fieldRecs, chunks] = await Promise.all([
    supabase.from('bots').select('id, name, total_conversations, total_messages, total_tokens, avatar_color, model, provider'),
    supabase.from('bot_documents').select('id, name, type, status, chunk_count, created_at'),
    supabase.from('crm_contacts').select('id, status, created_at'),
    supabase.from('bot_conversations').select('id, title, created_at, message_count').order('created_at', { ascending: false }).limit(8),
    supabase.from('field_recommendations').select('id, crop, hectares, created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('bot_chunks').select('document_id'),
  ])

  const botList = bots.data ?? []
  const docList = docs.data ?? []
  const contactList = contacts.data ?? []

  // Contact pipeline counts
  const pipeline = { nuevo: 0, en_progreso: 0, con_venta: 0, sin_venta: 0, esperando: 0 }
  for (const c of contactList) { const s = c.status as keyof typeof pipeline; if (s in pipeline) pipeline[s]++ }

  // Most "consulted" docs = those with most chunks indexed (proxy for content richness/usage)
  const chunkCount: Record<string, number> = {}
  for (const ch of chunks.data ?? []) chunkCount[ch.document_id] = (chunkCount[ch.document_id] ?? 0) + 1
  const topDocs = docList
    .filter(d => d.status === 'ready')
    .map(d => ({ name: d.name, type: d.type, chunks: chunkCount[d.id] ?? d.chunk_count ?? 0 }))
    .sort((a, b) => b.chunks - a.chunks)
    .slice(0, 6)

  // Recent documents
  const recentDocs = docList
    .slice()
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 5)
    .map(d => ({ name: d.name, type: d.type, status: d.status, created_at: d.created_at }))

  // Totals
  const totals = {
    bots: botList.length,
    docs: docList.length,
    docsReady: docList.filter(d => d.status === 'ready').length,
    contacts: contactList.length,
    conversations: botList.reduce((s, b) => s + (b.total_conversations ?? 0), 0),
    messages: botList.reduce((s, b) => s + (b.total_messages ?? 0), 0),
    tokens: botList.reduce((s, b) => s + (b.total_tokens ?? 0), 0),
    fieldRecs: (fieldRecs.data ?? []).length,
  }

  return NextResponse.json({
    totals,
    pipeline,
    bots: botList.map(b => ({ name: b.name, color: b.avatar_color, model: b.model, conversations: b.total_conversations, tokens: b.total_tokens })),
    topDocs,
    recentDocs,
    recentConversations: (convos.data ?? []).map(c => ({ title: c.title, created_at: c.created_at, messages: c.message_count })),
    recentFieldRecs: fieldRecs.data ?? [],
  }, { headers: { 'Cache-Control': 'no-store' } })
}
