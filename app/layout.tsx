import type { Metadata } from 'next'
import { cache } from 'react'
import './globals.css'
import PWARegister from '@/components/pwa-register'
import BrandingProvider from '@/components/branding-provider'
import DialogHost from '@/components/dialog-host'
import MailComposeHost from '@/components/mail-compose-host'
import { createServiceClient } from '@/lib/supabase/server'
import { hexToRgbTriplet, darkenHex, tintHex } from '@/lib/color'

const DEFAULT_NAME = 'Influmo CRM'
const DEFAULT_TAGLINE = 'Decoración de Interiores'
const DEFAULT_ACCENT = '#0d9488'

interface Brand { name: string; tagline: string; favicon: string; accent: string }
const FALLBACK: Brand = { name: DEFAULT_NAME, tagline: DEFAULT_TAGLINE, favicon: '', accent: DEFAULT_ACCENT }

// Single, per-request-cached, timeout-guarded branding read. If Supabase is
// slow/paused this resolves to defaults in ≤2.5s instead of hanging the render.
const getBrand = cache(async (): Promise<Brand> => {
  try {
    const supabase = createServiceClient()
    const query = supabase.from('settings').select('key, value').in('key', ['brand_app_name', 'brand_app_tagline', 'brand_favicon', 'brand_accent_color'])
    const data = await Promise.race([
      query.then(r => r.data),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('branding timeout')), 2500)),
    ])
    const get = (k: string) => (data as { key: string; value: string }[] | null)?.find(s => s.key === k)?.value
    return {
      name: get('brand_app_name') || DEFAULT_NAME,
      tagline: get('brand_app_tagline') || DEFAULT_TAGLINE,
      favicon: get('brand_favicon') || '',
      accent: get('brand_accent_color') || DEFAULT_ACCENT,
    }
  } catch { return FALLBACK }
})

// Without this, Next.js can statically evaluate generateMetadata at BUILD
// time (since it has no obvious per-request signal like cookies()/headers())
// and freeze the <title>/favicon into the static HTML shell forever — so
// branding changes in Settings would never show up until the next deploy.
// Forcing dynamic rendering makes it re-read the settings table on every
// request.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { name, tagline, favicon } = await getBrand()

  return {
    title: name,
    description: `${name} — ${tagline}`,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: name },
    icons: favicon
      ? { icon: [{ url: favicon }], apple: favicon }
      : {
          icon: [
            { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
          apple: '/apple-icon.png',
        },
  }
}

export async function generateViewport() {
  const { accent } = await getBrand()
  return { themeColor: accent, width: 'device-width', initialScale: 1, maximumScale: 5 }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Inject the saved brand color as inline CSS vars on <html> so the very first
  // paint is already the correct brand color — no green flash of the default
  // theme before the client-side BrandingProvider runs.
  const { accent } = await getBrand()
  const brandVars = {
    '--brand': accent,
    '--brand-rgb': hexToRgbTriplet(accent),
    '--brand-dark-rgb': darkenHex(accent, 0.15),
    '--brand-light': tintHex(accent, 0.12),
  } as React.CSSProperties

  return (
    <html lang="es" style={brandVars}>
      <body>
        {children}
        <BrandingProvider />
        <PWARegister />
        <DialogHost />
        <MailComposeHost />
      </body>
    </html>
  )
}
