import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const configured = Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
  )

  return NextResponse.json({
    connected: configured,
    phone_number_id: configured ? process.env.WHATSAPP_PHONE_NUMBER_ID : null,
    webhook_verify_token_set: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
  })
}
