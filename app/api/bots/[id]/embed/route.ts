import { NextResponse } from 'next/server'
import { embedDocument } from '@/lib/embed-document'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { id: botId } = await params
  const { documentId } = await req.json() as { documentId: string }

  const result = await embedDocument(botId, documentId)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ success: true, chunks: result.chunks })
}
