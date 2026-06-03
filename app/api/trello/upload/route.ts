import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Máx. 10 MB' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const safe = file.name.replace(/[^\w.\-]/g, '_')
  const path = `trello/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('bot-documents')
    .upload(path, buffer, { contentType: file.type || 'image/png', upsert: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = supabase.storage.from('bot-documents').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl }, { status: 201 })
}
