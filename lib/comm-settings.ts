import { createClient } from '@/lib/supabase/server'

export const SECRET_KEYS = ['smtp_pass', 'imap_pass', 'wa_token'] as const
export const MASK = '__unchanged__'

export type CommSettingsRaw = Record<string, string>

export async function getCommSettingsRaw(): Promise<CommSettingsRaw> {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('key,value').like('key', 'comm_%')
  const obj: CommSettingsRaw = {}
  for (const row of data ?? []) obj[row.key.replace(/^comm_/, '')] = row.value
  return obj
}

export async function saveCommSettings(patch: Record<string, string>) {
  const supabase = await createClient()
  const existing = await getCommSettingsRaw()
  const rows = Object.entries(patch)
    .filter(([key, value]) => {
      if (value === undefined || value === null) return false
      if ((SECRET_KEYS as readonly string[]).includes(key) && value === MASK) return false
      return true
    })
    .map(([key, value]) => ({ key: `comm_${key}`, value: String(value) }))
  if (rows.length === 0) return
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
  if (error) throw error
  return existing
}

export function resolveSecret(incoming: string | undefined, saved: CommSettingsRaw, key: string): string {
  if (incoming && incoming !== MASK) return incoming
  return saved[key] ?? ''
}
