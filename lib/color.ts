// Hex → "r g b" string for CSS rgb(var() / alpha)
export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return `${r} ${g} ${b}`
}

// Darken a hex color by a factor (0-1)
export function darkenHex(hex: string, amount = 0.15): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = Math.max(0, Math.round((parseInt(full.slice(0, 2), 16) || 0) * (1 - amount)))
  const g = Math.max(0, Math.round((parseInt(full.slice(2, 4), 16) || 0) * (1 - amount)))
  const b = Math.max(0, Math.round((parseInt(full.slice(4, 6), 16) || 0) * (1 - amount)))
  return `${r} ${g} ${b}`
}

// Light tint of a hex color
export function tintHex(hex: string, alpha = 0.12): string {
  return `rgba(${hexToRgbTriplet(hex).replace(/ /g, ', ')}, ${alpha})`
}

export function applyBrand(accent: string) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--brand-rgb', hexToRgbTriplet(accent))
  root.style.setProperty('--brand-dark-rgb', darkenHex(accent, 0.15))
  root.style.setProperty('--brand-light', tintHex(accent, 0.12))
  root.style.setProperty('--brand', accent)
}
