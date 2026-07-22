'use client'

import { useEffect } from 'react'

// Service Worker disabled: an old SW could still be installed in a returning
// visitor's browser (from a previous build) and would keep serving stale
// cached HTML/JS — looking like "another CRM" loaded. We unregister it and
// clear its caches, then force ONE reload so the very next request is
// guaranteed to hit the network with no SW in the way. Guarded by a
// sessionStorage flag so it only happens once per tab, never loops.
export default function PWARegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistrations().then(async regs => {
      if (regs.length === 0) return
      await Promise.all(regs.map(r => r.unregister()))
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
      const alreadyReloaded = sessionStorage.getItem('sw_cleanup_reload')
      if (!alreadyReloaded) {
        sessionStorage.setItem('sw_cleanup_reload', '1')
        window.location.reload()
      }
    }).catch(() => {})
  }, [])
  return null
}
