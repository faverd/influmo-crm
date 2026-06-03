'use client'

import { useEffect } from 'react'
import { applyBrand } from '@/lib/color'
import { getBranding } from '@/lib/branding-cache'

// Loads branding settings (cached) and applies accent color + B&W mode globally
export default function BrandingProvider() {
  useEffect(() => {
    getBranding().then(b => {
      if (b.brand_accent_color) applyBrand(b.brand_accent_color)
      document.documentElement.classList.toggle('bw-mode', b.brand_bw_mode === '1')
    })
  }, [])
  return null
}
