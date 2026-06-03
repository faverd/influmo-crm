import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// PUBLIC branding read — used by the login page (unauthenticated)
const BRANDING_KEYS = [
  'brand_accent_color', 'brand_button_color', 'brand_bw_mode',
  'brand_profile_photo', 'brand_login_bg', 'brand_login_logo', 'brand_nav_logo',
]

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('settings').select('key, value').in('key', BRANDING_KEYS)
  const out: Record<string, string> = {}
  for (const row of data ?? []) out[row.key] = row.value
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })
}
