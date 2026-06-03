import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('bots')
      .select('id, name, description, mode, provider, model, is_active, avatar_color, total_conversations, total_messages, total_tokens, created_at, language, tts_enabled, tts_voice, tts_speed, tts_pitch')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[/api/bots GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('bots')
    .insert({
      name:         body.name,
      description:  body.description ?? '',
      mode:         body.mode ?? 'general',
      provider:     body.provider ?? 'openai',
      model:        body.model ?? 'gpt-4o-mini',
      api_key:      body.api_key ?? '',
      embedding_key: body.embedding_key ?? '',
      temperature:  body.temperature ?? 0.7,
      max_tokens:   body.max_tokens ?? 2048,
      personality:  body.personality ?? '',
      language:     body.language ?? 'es',
      system_prompt: body.system_prompt ?? '',
      avatar_color: body.avatar_color ?? '#f5a623',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
