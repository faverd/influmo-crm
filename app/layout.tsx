import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Influmo CRM',
  description: 'WhatsApp CRM con agente IA Berta',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
