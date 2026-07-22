import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCommSettingsRaw, saveCommSettings, SECRET_KEYS, MASK } from '@/lib/comm-settings'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await getCommSettingsRaw()
  const secretsSet: Record<string, boolean> = {}
  const safe: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if ((SECRET_KEYS as readonly string[]).includes(key)) {
      secretsSet[key] = Boolean(value)
      safe[key] = value ? MASK : ''
    } else {
      safe[key] = value
    }
  }
  return NextResponse.json({ ...safe, secretsSet })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patch = await req.json()
  if (typeof patch !== 'object' || !patch) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  try {
    await saveCommSettings(patch)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
