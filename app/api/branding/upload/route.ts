import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// Uploads a branding image (logo, background, profile photo) and stores its URL under a settings key
export async function POST(req: Request) {
  const supabase = createServiceClient()
  const form = await req.formData()
  const file = form.get('file') as File | null
  const key = form.get('key') as string | null
  if (!file || !key) return NextResponse.json({ error: 'Falta archivo o key' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Máx. 10 MB' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const safe = file.name.replace(/[^\w.\-]/g, '_')
  const path = `branding/${key}-${Date.now()}-${safe}`

  const { error: upErr } = await supabase.storage
    .from('bot-documents')
    .upload(path, buffer, { contentType: file.type || 'image/png', upsert: true })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from('bot-documents').getPublicUrl(path)
  const url = urlData.publicUrl

  await supabase.from('settings').upsert({ key, value: url }, { onConflict: 'key' })
  return NextResponse.json({ url }, { status: 201 })
}
