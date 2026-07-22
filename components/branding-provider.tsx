'use client'

import { useEffect } from 'react'
import { applyBrand } from '@/lib/color'
import { getBranding, applyBrandingChrome } from '@/lib/branding-cache'

// Loads branding settings (cached) and applies accent color, B&W mode,
// document title and favicon globally — so uploads in Settings take effect
// immediately without a redeploy.
export default function BrandingProvider() {
  useEffect(() => {
    getBranding().then(b => {
      if (b.brand_accent_color) applyBrand(b.brand_accent_color)
      document.documentElement.classList.toggle('bw-mode', b.brand_bw_mode === '1')
      applyBrandingChrome(b)
    })
  }, [])
  return null
}
