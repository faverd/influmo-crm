import type { Metadata, Viewport } from 'next'
import './globals.css'
import PWARegister from '@/components/pwa-register'
import BrandingProvider from '@/components/branding-provider'

export const metadata: Metadata = {
  title: 'Influmo CRM',
  description: 'WhatsApp CRM con agente IA y clima agrícola inteligente',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Influmo Agro' },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <BrandingProvider />
        <PWARegister />
      </body>
    </html>
  )
}
