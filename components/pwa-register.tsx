'use client'

import { useEffect } from 'react'

// Service Worker disabled: it caused cross-cache between the two systems
// running on different ports. This now actively unregisters any existing SW
// and clears its caches so each port serves its own fresh content.
export default function PWARegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister())
      }).catch(() => {})
    }
    if (typeof caches !== 'undefined') {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {})
    }
  }, [])
  return null
}
