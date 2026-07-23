import type { Metadata } from 'next'
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

async function getAccent(): Promise<string> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('settings').select('value').eq('key', 'brand_accent_color').maybeSingle()
    return (data?.value as string) || DEFAULT_ACCENT
  } catch { return DEFAULT_ACCENT }
}

// Without this, Next.js can statically evaluate generateMetadata at BUILD
// time (since it has no obvious per-request signal like cookies()/headers())
// and freeze the <title>/favicon into the static HTML shell forever — so
// branding changes in Settings would never show up until the next deploy.
// Forcing dynamic rendering makes it re-read the settings table on every
// request.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['brand_app_name', 'brand_app_tagline', 'brand_favicon'])
  const get = (k: string) => data?.find(s => s.key === k)?.value
  const name = get('brand_app_name') || DEFAULT_NAME
  const tagline = get('brand_app_tagline') || DEFAULT_TAGLINE
  const favicon = get('brand_favicon')

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
  const accent = await getAccent()
  return { themeColor: accent, width: 'device-width', initialScale: 1, maximumScale: 5 }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Inject the saved brand color as inline CSS vars on <html> so the very first
  // paint is already the correct brand color — no green flash of the default
  // theme before the client-side BrandingProvider runs.
  const accent = await getAccent()
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
