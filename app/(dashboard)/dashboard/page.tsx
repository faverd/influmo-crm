'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bot, FileText, Users, MessageSquare, Sparkles, CloudSun, Droplets,
  Wind, Sun, DollarSign, TrendingUp, MapPin, FileType, Loader2, Ruler,
  ArrowUpRight, Leaf, Package, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Stats {
  totals: { bots: number; docs: number; docsReady: number; contacts: number; conversations: number; messages: number; tokens: number; fieldRecs: number }
  pipeline: Record<string, number>
  bots: { name: string; color: string; model: string; conversations: number; tokens: number }[]
  topDocs: { name: string; type: string; chunks: number }[]
  recentDocs: { name: string; type: string; status: string; created_at: string }[]
  recentConversations: { title: string; created_at: string; messages: number }[]
  recentFieldRecs: { crop: string; hectares: number; created_at: string }[]
}

interface Fx { pen: number; eur: number; brl: number; updated: string }
interface Weather { temp: number; humidity: number; wind: number; uv: number; code: number; place: string }

const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : ''

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [fx, setFx] = useState<Fx | null>(null)
  const [weather, setWeather] = useState<Weather | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/stats').then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/dashboard/fx').then(r => r.json()).then(d => { if (!d.error) setFx(d) }).catch(() => {})

    const fetchWeather = async (lat: number, lon: number, place: string) => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index&timezone=auto`)
        const d = await r.json()
        const c = d.current
        setWeather({ temp: Math.round(c.temperature_2m), humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m), uv: Math.round(c.uv_index ?? 0), code: c.weather_code, place })
      } catch { /* ignore */ }
    }
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          try {
            const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&count=1&language=es`).then(r => r.json())
            fetchWeather(pos.coords.latitude, pos.coords.longitude, g.results?.[0]?.name ?? 'Mi ubicación')
          } catch { fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Mi ubicación') }
        },
        () => fetchWeather(-12.0464, -77.0428, 'Lima'),
        { timeout: 8000 }
      )
    } else fetchWeather(-12.0464, -77.0428, 'Lima')
  }, [])

  const t = stats?.totals

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
          <p className="text-sm text-gray-500">Resumen de tu plataforma de Decoración de Interiores</p>
        </div>
        <p className="text-sm text-gray-400 capitalize">{new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Weather + FX + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-1.5"><Bot size={14} /> Consultor BOT IA</span>
            <Sparkles size={22} className="text-white/80" />
          </div>
          <p className="text-4xl font-bold mb-3">{t?.bots ?? 0}</p>
          <p className="text-sm text-white/80 mb-3">Bots configurados</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/15 rounded-lg p-2"><MessageSquare size={13} className="mb-0.5" />{t?.conversations ?? 0} Conv.</div>
            <div className="bg-white/15 rounded-lg p-2"><Zap size={13} className="mb-0.5" />{t?.messages ?? 0} Msg</div>
          </div>
          <Link href="/bot-ia" className="text-xs text-white/90 hover:text-white flex items-center gap-1 mt-3">Ver bots <ArrowUpRight size={12} /></Link>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-1.5"><DollarSign size={14} /> Tipo de cambio</span>
            <TrendingUp size={20} className="text-white/80" />
          </div>
          {fx ? (
            <>
              <p className="text-3xl font-bold">S/ {fx.pen?.toFixed(3)}</p>
              <p className="text-xs text-white/70 mb-3">1 USD → Soles peruanos</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/15 rounded-lg p-2">EUR<br /><span className="font-semibold">{fx.eur?.toFixed(3)}</span></div>
                <div className="bg-white/15 rounded-lg p-2">BRL<br /><span className="font-semibold">{fx.brl?.toFixed(3)}</span></div>
              </div>
            </>
          ) : <Loader2 size={20} className="animate-spin text-white/60" />}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/bot-ia', icon: Bot, label: 'Consultor IA', color: 'bg-violet-50 text-violet-600' },
            { href: '/contactos', icon: Users, label: 'Contactos', color: 'bg-blue-50 text-blue-600' },
            { href: '/kanban', icon: MessageSquare, label: 'Kanban', color: 'bg-emerald-50 text-emerald-600' },
            { href: '/calendar', icon: Sparkles, label: 'Calendario', color: 'bg-amber-50 text-amber-600' },
          ].map(q => (
            <Link key={q.href} href={q.href} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all flex flex-col justify-center">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', q.color)}><q.icon size={17} /></div>
              <span className="text-sm font-semibold text-gray-800">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Bot, label: 'Bots IA', value: t?.bots ?? 0, color: 'text-violet-600 bg-violet-50' },
          { icon: FileText, label: 'Documentos', value: `${t?.docsReady ?? 0}/${t?.docs ?? 0}`, color: 'text-blue-600 bg-blue-50' },
          { icon: Users, label: 'Contactos', value: t?.contacts ?? 0, color: 'text-green-600 bg-green-50' },
          { icon: MessageSquare, label: 'Conversaciones', value: t?.conversations ?? 0, color: 'text-amber-600 bg-amber-50' },
          { icon: Zap, label: 'Mensajes IA', value: t?.messages ?? 0, color: 'text-pink-600 bg-pink-50' },
          { icon: Sparkles, label: 'Tokens', value: t ? (t.tokens > 1000 ? `${(t.tokens / 1000).toFixed(1)}K` : t.tokens) : 0, color: 'text-teal-600 bg-teal-50' },
          { icon: Sparkles, label: 'Proyectos activos', value: 0, color: 'text-orange-600 bg-orange-50' },
          { icon: Leaf, label: 'Docs indexados', value: t?.docsReady ?? 0, color: 'text-emerald-600 bg-emerald-50' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', m.color)}><m.icon size={17} /></div>
            <p className="text-2xl font-bold text-gray-900">{m.value}</p>
            <p className="text-xs text-gray-400">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline + top docs + bots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Users size={16} /> Pipeline de contactos</h2>
            <Link href="/contactos" className="text-xs text-brand hover:underline">Ver todos →</Link>
          </div>
          {stats ? (
            <div className="space-y-3">
              {[
                { k: 'nuevo', label: 'Nuevos', color: '#3b82f6' },
                { k: 'en_progreso', label: 'En progreso', color: '#f59e0b' },
                { k: 'con_venta', label: 'Con venta', color: '#16a34a' },
                { k: 'sin_venta', label: 'Sin venta', color: '#ef4444' },
                { k: 'esperando', label: 'Esperando', color: '#a855f7' },
              ].map(s => {
                const val = stats.pipeline[s.k] ?? 0
                const max = Math.max(...Object.values(stats.pipeline), 1)
                return (
                  <div key={s.k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{s.label}</span>
                      <span className="font-semibold text-gray-900">{val}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(val / max) * 100}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <Loader2 size={18} className="animate-spin text-gray-300 mx-auto my-8" />}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><FileType size={16} /> Fichas más consultadas</h2>
            <Link href="/bot-ia" className="text-xs text-brand hover:underline">Docs →</Link>
          </div>
          {stats?.topDocs.length ? (
            <div className="space-y-2">
              {stats.topDocs.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                  <p className="text-sm text-gray-800 truncate flex-1">{d.name}</p>
                  <span className="text-xs text-gray-400 shrink-0">{d.chunks} frag.</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sin documentos indexados</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><Bot size={16} /> Actividad por bot</h2>
          {stats?.bots.length ? (
            <div className="space-y-3">
              {stats.bots.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (b.color ?? '#16a34a') + '20' }}>
                    <Bot size={15} style={{ color: b.color ?? '#16a34a' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.model}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{b.conversations} conv.</p>
                    <p className="text-xs text-gray-400">{(b.tokens ?? 0).toLocaleString()} tk</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sin bots configurados</p>}
        </div>
      </div>

      {/* Recent docs + field analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText size={16} /> Documentos recientes</h2>
          {stats?.recentDocs.length ? (
            <div className="space-y-2">
              {stats.recentDocs.map((d, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <FileType size={15} className="text-red-300 shrink-0" />
                  <p className="text-sm text-gray-700 flex-1 truncate">{d.name}</p>
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full',
                    d.status === 'ready' ? 'bg-green-50 text-green-600' : d.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600')}>
                    {d.status === 'ready' ? 'Listo' : d.status === 'error' ? 'Error' : 'Pendiente'}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">{fmtDate(d.created_at)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sin documentos</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Package size={16} /> Actividad reciente</h2>
            <Link href="/contactos" className="text-xs text-brand hover:underline">Ver contactos →</Link>
          </div>
          {stats?.recentConversations?.length ? (
            <div className="space-y-2">
              {stats.recentConversations.map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 font-bold text-xs shrink-0"><MessageSquare size={13} /></span>
                  <p className="text-sm text-gray-700 flex-1 truncate">{r.title}</p>
                  <span className="text-xs text-gray-400 shrink-0">{fmtDate(r.created_at)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">Sin actividad reciente</p>}
        </div>
      </div>
    </div>
  )
}
