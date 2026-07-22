'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Home, Palette, Moon, Sun, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { applyBrand } from '@/lib/color'
import NotificationPanel, { type NotifMensaje } from '@/components/notification-panel'

const SWATCHES = ['#0d9488', '#16a34a', '#0ea5e9', '#7c3aed', '#dc2626', '#ea580c', '#475569', '#0f172a']

function playDing() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12)
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    o.connect(g); g.connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + 0.4)
  } catch {}
}

export default function TopBar() {
  const router = useRouter()
  const [openMenu, setOpenMenu] = useState<'palette' | null>(null)
  const [dark, setDark] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const [unreadCount, setUnreadCount] = useState(0)
  const [mensajes, setMensajes] = useState<NotifMensaje[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [ringing, setRinging] = useState(false)
  const prevUnread = useRef<number | null>(null)

  const loadMensajes = useCallback(async () => {
    try {
      const r = await fetch('/api/comunicacion/mensajes?folder=bandeja&limit=8')
      if (!r.ok) return
      const d = await r.json()
      setMensajes(d.mensajes ?? [])
      setUnreadCount(d.unread_count ?? 0)
      if (prevUnread.current !== null && (d.unread_count ?? 0) > prevUnread.current) {
        playDing()
        setRinging(true)
        setTimeout(() => setRinging(false), 650)
      }
      prevUnread.current = d.unread_count ?? 0
    } catch {}
  }, [])

  useEffect(() => {
    loadMensajes()
    const id = setInterval(loadMensajes, 20000)
    return () => clearInterval(id)
  }, [loadMensajes])

  async function markAllRead() {
    await Promise.all(mensajes.filter(m => !m.leido).map(m =>
      fetch(`/api/comunicacion/mensajes/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leido: true }) })
    ))
    loadMensajes()
  }

  function openMensaje(id: string) {
    fetch(`/api/comunicacion/mensajes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leido: true }) })
      .then(loadMensajes)
    setNotifOpen(false)
    router.push('/comunicacion/bandeja')
  }

  useEffect(() => {
    const isDark = localStorage.getItem('deco_theme') === 'dark'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('deco_theme', next ? 'dark' : 'light')
  }

  async function pickColor(c: string) {
    applyBrand(c)
    setOpenMenu(null)
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'brand_accent_color', value: c }),
    })
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div ref={ref} className="h-12 shrink-0 bg-white border-b border-gray-100 flex items-center justify-end gap-1 px-4 relative z-50">
      {/* Bell */}
      <div className="relative">
        <button onClick={() => setNotifOpen(true)}
          title="Notificaciones"
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
          <Bell size={16} className={ringing ? 'bell-ring' : ''} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
      {notifOpen && (
        <NotificationPanel
          mensajes={mensajes}
          onClose={() => setNotifOpen(false)}
          onMarkAllRead={markAllRead}
          onOpenMensaje={openMensaje}
        />
      )}

      {/* Home */}
      <Link href="/dashboard" title="Inicio"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
        <Home size={16} />
      </Link>

      {/* Palette */}
      <div className="relative">
        <button onClick={() => setOpenMenu(m => m === 'palette' ? null : 'palette')}
          title="Color de acento"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
          <Palette size={16} />
        </button>
        {openMenu === 'palette' && (
          <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-100 p-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Color de acento</p>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map(c => (
                <button key={c} onClick={() => pickColor(c)} style={{ backgroundColor: c }}
                  className="w-7 h-7 rounded-lg transition hover:scale-110" />
              ))}
            </div>
            <Link href="/settings" onClick={() => setOpenMenu(null)}
              className="block text-center text-[11px] text-brand hover:underline mt-2.5">Más opciones →</Link>
          </div>
        )}
      </div>

      {/* Dark mode toggle */}
      <button onClick={toggleDark} title={dark ? 'Modo claro' : 'Modo oscuro'}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Settings */}
      <Link href="/settings" title="Configuración"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
        <Settings size={16} />
      </Link>

      {/* Logout */}
      <button onClick={handleLogout} title="Cerrar sesión"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
        <LogOut size={16} />
      </button>
    </div>
  )
}
