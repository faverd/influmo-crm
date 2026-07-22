import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['brand_app_name', 'brand_accent_color'])
  const get = (k: string) => data?.find(s => s.key === k)?.value
  const name = get('brand_app_name') || 'Influmo CRM'
  const accent = get('brand_accent_color') || '#0d9488'

  return {
    name,
    short_name: name,
    description: `CRM con consultor IA para empresas de Decoración de Interiores`,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: accent,
    orientation: 'portrait-primary',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
