// Shared branding fetch with in-memory + sessionStorage cache
// Avoids re-fetching /api/branding on every page navigation.

let cache: Record<string, string> | null = null
let inflight: Promise<Record<string, string>> | null = null

export async function getBranding(): Promise<Record<string, string>> {
  if (cache) return cache
  // Try sessionStorage first (survives client navigations)
  if (typeof window !== 'undefined') {
    try {
      const s = sessionStorage.getItem('branding_cache')
      if (s) { cache = JSON.parse(s); return cache! }
    } catch { /* ignore */ }
  }
  if (inflight) return inflight
  inflight = fetch('/api/branding')
    .then(r => r.json())
    .then((d: Record<string, string>) => {
      cache = d || {}
      try { sessionStorage.setItem('branding_cache', JSON.stringify(cache)) } catch { /* ignore */ }
      inflight = null
      return cache
    })
    .catch(() => { inflight = null; return {} })
  return inflight
}

export function clearBrandingCache() {
  cache = null
  try { sessionStorage.removeItem('branding_cache') } catch { /* ignore */ }
}

// Applies document title + favicon from branding settings. Safe to call
// repeatedly (e.g. right after saving in Settings, so it takes effect
// immediately without waiting for a full page reload).
export function applyBrandingChrome(b: Record<string, string>) {
  if (typeof document === 'undefined') return
  if (b.brand_app_name) document.title = b.brand_app_name
  if (b.brand_favicon) {
    document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']").forEach(el => el.remove())
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = b.brand_favicon
    document.head.appendChild(link)
  }
}
