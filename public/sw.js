// Kill-switch service worker.
//
// A previous deployment registered a real caching SW. Browsers that visited
// back then still have it installed and it can get stuck serving a frozen,
// stale copy of the app (old bundle, old branding) forever — because our
// app-side unregister code lives in that same stale JS that never gets a
// chance to run.
//
// The browser fetches THIS file directly from the network on every SW
// update check, bypassing whatever the old SW's fetch handler does. So this
// file is the one place we can reliably break the loop: install immediately
// (skipWaiting), take control of every open tab without requiring them to
// close (clients.claim), wipe all caches, unregister, and force each open
// tab to reload once so it lands on a real network response.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.clients.claim()
      await self.registration.unregister()
      const clientsList = await self.clients.matchAll({ type: 'window' })
      for (const client of clientsList) {
        client.navigate(client.url)
      }
    })()
  )
})
