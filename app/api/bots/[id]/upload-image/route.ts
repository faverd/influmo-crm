import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60
export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

// Uploads an image for chat vision analysis, returns a public URL
export async function POST(req: Request, { params }: Params) {
  const { id: botId } = await params
  const supabase = createServiceClient()

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen supera 20 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^\w.\-]/g, '_')
  const storagePath = `${botId}/chat/${Date.now()}-${safeName}`

  const { error: uploadErr } = await supabase.storage
    .from('bot-documents')
    .upload(storagePath, buffer, { contentType: file.type || 'image/jpeg', upsert: false })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from('bot-documents').getPublicUrl(storagePath)
  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 })
}
