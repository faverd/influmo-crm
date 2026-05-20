import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string; docId: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const { docId } = await params
  const supabase = createServiceClient()

  // Remove from storage if file_path exists
  const { data: doc } = await supabase
    .from('bot_documents')
    .select('file_path')
    .eq('id', docId)
    .single()

  if (doc?.file_path) {
    await supabase.storage.from('bot-documents').remove([doc.file_path])
  }

  const { error } = await supabase.from('bot_documents').delete().eq('id', docId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
