import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chat } from '@/lib/openrouter'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, systemPrompt } = await req.json()

  const { data: promptSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'system_prompt')
    .single()

  const sp = systemPrompt ?? promptSetting?.value ?? ''

  try {
    const reply = await chat([
      { role: 'system', content: sp },
      ...messages,
    ])
    return NextResponse.json({ reply })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }
}
