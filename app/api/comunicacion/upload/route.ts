import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// Uploads an image or file for the mail editor and returns its public URL.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Falta archivo' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'Máx. 20 MB' }, { status: 400 })

  const db = createServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const safe = file.name.replace(/[^\w.\-]/g, '_')
  const path = `comunicacion/adjuntos/${Date.now()}-${safe}`
  const { error } = await db.storage.from('bot-documents').upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = db.storage.from('bot-documents').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, name: file.name, type: file.type }, { status: 201 })
}
