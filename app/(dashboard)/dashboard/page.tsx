'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText, DollarSign, MapPin, Loader2, ArrowRight,
  CloudSun, ChevronLeft, ChevronRight, Pencil, Plus, Trash2,
  GripVertical, Settings2, Check, X, LayoutPanelTop, Maximize2, Minimize2,
  Bot, Users, MessagesSquare, Zap, FileStack, HardHat,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { promptDialog, confirmDialog } from '@/lib/dialogs'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Fx { pen: number; eur?: number; brl?: number; buy: number; sell: number; updated: string }
interface Weather { temp: number; humidity: number; wind: number; uv: number; code: number; place: string; min?: number; max?: number }
interface Nota { id: string; titulo: string; contenido: string; color: string; created_at: string; updated_at: string }
interface CotStats { total: number; aprobadas: number; enviadas: number; monto: number }

const WEATHER_ICON: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 61: '🌧️', 71: '🌨️', 80: '🌦️', 95: '⛈️',
}
const WEATHER_DESC: Record<number, string> = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Neblina', 48: 'Neblina', 51: 'Llovizna', 61: 'Lluvia', 71: 'Nieve', 80: 'Aguacero', 95: 'Tormenta',
}
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const WIDGET_COLORS = ['#22c55e','#3b82f6','#a855f7','#f97316','#ef4444','#ec4899','#14b8a6','#111827']

// Cada pestaña (panel) tiene su propio conjunto de widgets
interface Panel { key: string; label: string; icon: string }
const DEFAULT_TABS: Panel[] = [
  { key: 'ventas',     label: 'Ventas',     icon: '🛒' },
  { key: 'almacen',    label: 'Almacén',    icon: '📦' },
  { key: 'calendario', label: 'Calendario', icon: '📅' },
]
const DEFAULT_PANELS: Record<string, string[]> = {
  ventas:     ['saludo','calendario','geo','comunicacion','cotizaciones','clima','fx','calculadora','notas'],
  almacen:    ['saludo','cotizaciones','calculadora','notas'],
  calendario: ['saludo','calendario','notas'],
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar() {
  const today = new Date()
  const [cur, setCur] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const firstDay = new Date(cur.y, cur.m, 1).getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const days = new Date(cur.y, cur.m + 1, 0).getDate()

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })}
          className="p-1 hover:bg-gray-100 rounded-lg transition"><ChevronLeft size={14} /></button>
        <span className="text-sm font-semibold text-gray-800">{MESES[cur.m]} {cur.y}</span>
        <button onClick={() => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })}
          className="p-1 hover:bg-gray-100 rounded-lg transition"><ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DIAS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5 flex-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const d = i + 1
          const isToday = cur.y === today.getFullYear() && cur.m === today.getMonth() && d === today.getDate()
          return (
            <button key={d}
              className={cn('h-7 w-full text-[11px] rounded-lg font-medium transition hover:bg-gray-100',
                isToday ? 'bg-brand text-white hover:bg-brand/90' : 'text-gray-600')}>
              {d}
            </button>
          )
        })}
      </div>
      <div className="mt-2 text-center">
        <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <span className="w-2 h-2 rounded-full bg-brand inline-block" /> Con eventos/tareas
          <Link href="/calendar" className="ml-2 text-brand hover:underline">Ver calendario →</Link>
        </p>
      </div>
    </div>
  )
}

// ─── Gauge ───────────────────────────────────────────────────────────────────
function CircularGauge({ pct, color = '#16a34a' }: { pct: number; color?: string }) {
  const r = 54; const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="mx-auto">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 65 65)" />
      <text x="65" y="65" textAnchor="middle" dy="0.4em" fill="#111827" fontSize="22" fontWeight="700">{pct}%</text>
    </svg>
  )
}

// ─── Widget Wrapper ──────────────────────────────────────────────────────────
interface WidgetProps {
  id: string
  title: string
  icon: string
  editMode: boolean
  color?: string
  onColorChange: (id: string, color: string) => void
  onRemove: (id: string) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
  height?: number
  onResized?: (id: string, h: number) => void
  width?: 1 | 2 | 3
  onWidthChange?: (id: string) => void
  children: React.ReactNode
}
function Widget({ id, title, icon, editMode, color, onColorChange, onRemove, dragHandleProps, isDragging, height, onResized, width, onWidthChange, children }: WidgetProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const tinted = Boolean(color)

  function handleMouseUp() {
    if (editMode && boxRef.current && onResized) onResized(id, boxRef.current.offsetHeight)
  }

  return (
    <div
      ref={boxRef}
      onMouseUp={handleMouseUp}
      style={{
        backgroundColor: tinted ? `${color}14` : undefined,
        borderColor: tinted ? `${color}44` : undefined,
        height: '100%',
        resize: editMode ? 'vertical' : undefined,
        overflow: editMode ? 'auto' : 'hidden',
      }}
      className={cn(
        'bg-white rounded-2xl border border-gray-100 p-5 transition-all duration-200',
        isDragging && 'shadow-2xl ring-2 ring-brand/30 scale-[1.02] z-50',
        editMode && 'ring-1 ring-brand/20'
      )}>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {editMode && (
            <div {...dragHandleProps} className="p-1 -ml-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 cursor-grab active:cursor-grabbing transition shrink-0">
              <GripVertical size={13} />
            </div>
          )}
          <p className="font-semibold text-gray-900 flex items-center gap-2 text-sm truncate">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs"
              style={{ backgroundColor: tinted ? `${color}33` : '#f3f4f6' }}>
              {icon}
            </span>
            <span className="truncate">{title}</span>
          </p>
        </div>
        {editMode && (
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-0.5 mr-1">
              {WIDGET_COLORS.map(c => (
                <button key={c} onClick={() => onColorChange(id, color === c ? '' : c)}
                  style={{ backgroundColor: c }}
                  className={cn('w-3 h-3 rounded-full transition hover:scale-125',
                    color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-125' : '')} />
              ))}
            </div>
            {onWidthChange && (
              <button onClick={() => onWidthChange(id)} title="Cambiar ancho"
                className="p-1 rounded-lg text-gray-300 hover:text-brand hover:bg-brand/10 transition">
                {width && width > 1 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            )}
            <button onClick={() => onRemove(id)}
              className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Notas Widget ────────────────────────────────────────────────────────────
function NotasWidget() {
  const [notas, setNotas] = useState<Nota[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => { loadNotas() }, [])
  async function loadNotas() {
    const sb = createClient()
    const { data } = await sb.from('notas_rapidas').select('*').order('updated_at', { ascending: false }).limit(6)
    setNotas(data ?? [])
  }
  async function createNota() {
    const sb = createClient()
    const { data } = await sb.from('notas_rapidas').insert({ titulo: 'Nueva nota', contenido: '', color: '#fef3c7' }).select().single()
    if (data) { setNotas(n => [data, ...n]); setEditing(data.id); setDraft('') }
  }
  async function saveNota(id: string) {
    const sb = createClient()
    await sb.from('notas_rapidas').update({ contenido: draft, updated_at: new Date().toISOString() }).eq('id', id)
    setEditing(null); loadNotas()
  }
  async function deleteNota(id: string) {
    const sb = createClient()
    await sb.from('notas_rapidas').delete().eq('id', id)
    setNotas(n => n.filter(x => x.id !== id))
  }

  const first = notas[0]
  return (
    <>
      <div className="flex justify-end mb-2">
        <button onClick={createNota} className="p-1 hover:bg-gray-100 rounded-lg transition text-brand"><Plus size={14} /></button>
      </div>
      {first ? (
        <div className="bg-amber-50 rounded-xl p-3 mb-3 min-h-[90px]">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs font-semibold text-amber-800">😊 🌐 💊 🔒 {first.titulo}</p>
            <div className="flex gap-1">
              <button onClick={() => { setEditing(first.id); setDraft(first.contenido ?? '') }} className="text-amber-400 hover:text-amber-700 transition"><Pencil size={10} /></button>
              <button onClick={() => deleteNota(first.id)} className="text-amber-400 hover:text-red-500 transition"><Trash2 size={10} /></button>
            </div>
          </div>
          {editing === first.id ? (
            <>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4}
                className="w-full text-xs border-0 bg-transparent focus:outline-none resize-none text-amber-900" autoFocus />
              <div className="flex gap-2 mt-1">
                <button onClick={() => saveNota(first.id)} className="text-xs bg-amber-700 text-white px-2 py-0.5 rounded">Guardar</button>
                <button onClick={() => setEditing(null)} className="text-xs text-amber-600">Cancelar</button>
              </div>
            </>
          ) : (
            <p className="text-xs text-amber-900 leading-relaxed line-clamp-4">{first.contenido || 'Sin contenido...'}</p>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 rounded-xl p-4 mb-3 text-center">
          <p className="text-xs text-amber-600">Sin notas aún. Crea una con +</p>
        </div>
      )}
    </>
  )
}

// ─── Métricas del CRM Widget ───────────────────────────────────────────────
function MetricasWidget() {
  const [loading, setLoading] = useState(true)
  const [m, setM] = useState({ bots: 0, docs: 0, contactos: 0, conversaciones: 0, mensajes: 0, tokens: 0, cotizaciones: 0, proyectos: 0 })

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.json()).catch(() => null),
      fetch('/api/contactos').then(r => r.json()).catch(() => null),
      fetch('/api/cotizaciones').then(r => r.json()).catch(() => null),
      fetch('/api/proyectos').then(r => r.json()).catch(() => null),
    ]).then(([stats, contactos, cotizaciones, proyectos]) => {
      const contactosArr = Array.isArray(contactos) ? contactos : contactos?.data ?? []
      setM({
        bots: stats?.totals?.bots ?? 0,
        docs: stats?.totals?.docs ?? 0,
        contactos: contactosArr.length ?? 0,
        conversaciones: stats?.totals?.conversations ?? 0,
        mensajes: stats?.totals?.messages ?? 0,
        tokens: stats?.totals?.tokens ?? 0,
        cotizaciones: Array.isArray(cotizaciones) ? cotizaciones.length : 0,
        proyectos: Array.isArray(proyectos) ? proyectos.length : 0,
      })
      setLoading(false)
    })
  }, [])

  const CARDS = [
    { key: 'bots',          label: 'Bots IA',        icon: Bot,            color: 'text-violet-600 bg-violet-50' },
    { key: 'docs',          label: 'Documentos',     icon: FileStack,      color: 'text-blue-600 bg-blue-50' },
    { key: 'contactos',     label: 'Contactos',      icon: Users,          color: 'text-teal-600 bg-teal-50' },
    { key: 'conversaciones',label: 'Conversaciones', icon: MessagesSquare, color: 'text-pink-600 bg-pink-50' },
    { key: 'mensajes',      label: 'Mensajes IA',    icon: Zap,            color: 'text-amber-600 bg-amber-50' },
    { key: 'tokens',        label: 'Tokens',         icon: Zap,            color: 'text-orange-600 bg-orange-50' },
    { key: 'cotizaciones',  label: 'Cotizaciones',   icon: FileText,       color: 'text-green-600 bg-green-50' },
    { key: 'proyectos',     label: 'Proyectos',      icon: HardHat,        color: 'text-red-600 bg-red-50' },
  ] as const

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 h-full content-start">
      {CARDS.map(c => (
        <div key={c.key} className="bg-gray-50/60 rounded-xl p-3">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2', c.color)}>
            <c.icon size={13} />
          </div>
          <p className="text-lg font-bold text-gray-900">{loading ? '—' : m[c.key]}</p>
          <p className="text-[10px] text-gray-400">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState('')
  const [time, setTime] = useState(new Date())
  const [fx, setFx] = useState<Fx | null>(null)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [cotStats, setCotStats] = useState<CotStats>({ total: 0, aprobadas: 0, enviadas: 0, monto: 0 })
  const [mensajes, setMensajes] = useState<{de:string;asunto:string;fecha:string;leido:boolean}[]>([])

  useEffect(() => {
    fetch('/api/comunicacion/mensajes?folder=bandeja&limit=5').then(r => r.json()).then(d => {
      const list = Array.isArray(d?.mensajes) ? d.mensajes : []
      setMensajes(list.map((m: { de_nombre?: string; de_email?: string; asunto?: string; created_at: string; leido: boolean }) => ({
        de: m.de_nombre || m.de_email || '—',
        asunto: m.asunto || '',
        fecha: new Date(m.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
        leido: m.leido,
      })))
    }).catch(() => {})
  }, [])
  const [topCiudades, setTopCiudades] = useState<[string,number][]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [fxInput, setFxInput] = useState('1')
  const [pctBase, setPctBase] = useState('')
  const [pctCustom, setPctCustom] = useState('10')
  const [activePct, setActivePct] = useState('10')

  // Panels (pestañas) + widgets por panel
  const [tabs, setTabs] = useState<Panel[]>(DEFAULT_TABS)
  const [activeTab, setActiveTab] = useState('ventas')
  const [panels, setPanels] = useState<Record<string,string[]>>(DEFAULT_PANELS)
  const [savedPanels, setSavedPanels] = useState<Record<string,string[]>>(DEFAULT_PANELS)
  const [savedTabs, setSavedTabs] = useState<Panel[]>(DEFAULT_TABS)

  // Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [widgetColors, setWidgetColors] = useState<Record<string,string>>({})
  const [savedColors, setSavedColors] = useState<Record<string,string>>({})
  const [widgetSizes, setWidgetSizes] = useState<Record<string,number>>({})
  const [savedSizes, setSavedSizes] = useState<Record<string,number>>({})
  const [widgetWidths, setWidgetWidths] = useState<Record<string,1|2|3>>({})
  const [savedWidths, setSavedWidths] = useState<Record<string,1|2|3>>({})
  const [showCatalog, setShowCatalog] = useState(false)

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  // Widgets del panel activo
  const widgetOrder = panels[activeTab] ?? []

  // Load from localStorage
  useEffect(() => {
    try {
      const pnl = localStorage.getItem('deco_panels')
      const tbs = localStorage.getItem('deco_tabs')
      const col = localStorage.getItem('deco_widget_colors')
      const siz = localStorage.getItem('deco_widget_sizes')
      const wid = localStorage.getItem('deco_widget_widths')
      // Migración desde el modelo antiguo de una sola lista
      const legacy = localStorage.getItem('deco_widget_order')
      if (pnl) { const p = JSON.parse(pnl); setPanels(p); setSavedPanels(p) }
      else if (legacy) { const p = { ...DEFAULT_PANELS, ventas: JSON.parse(legacy) }; setPanels(p); setSavedPanels(p) }
      if (tbs) { const t = JSON.parse(tbs); setTabs(t); setSavedTabs(t) }
      if (col) { const c = JSON.parse(col); setWidgetColors(c); setSavedColors(c) }
      if (siz) { const s = JSON.parse(siz); setWidgetSizes(s); setSavedSizes(s) }
      if (wid) { const w = JSON.parse(wid); setWidgetWidths(w); setSavedWidths(w) }
    } catch { /* ignore */ }
  }, [])

  function saveLayout() {
    localStorage.setItem('deco_panels', JSON.stringify(panels))
    localStorage.setItem('deco_tabs', JSON.stringify(tabs))
    localStorage.setItem('deco_widget_colors', JSON.stringify(widgetColors))
    localStorage.setItem('deco_widget_sizes', JSON.stringify(widgetSizes))
    localStorage.setItem('deco_widget_widths', JSON.stringify(widgetWidths))
    setSavedPanels(structuredClone(panels))
    setSavedTabs([...tabs])
    setSavedColors({ ...widgetColors })
    setSavedSizes({ ...widgetSizes })
    setSavedWidths({ ...widgetWidths })
    setEditMode(false)
    setShowCatalog(false)
  }
  function cancelEdit() {
    setPanels(structuredClone(savedPanels))
    setTabs([...savedTabs])
    setWidgetColors({ ...savedColors })
    setWidgetSizes({ ...savedSizes })
    setWidgetWidths({ ...savedWidths })
    if (!savedTabs.some(t => t.key === activeTab)) setActiveTab(savedTabs[0]?.key ?? 'ventas')
    setEditMode(false)
    setShowCatalog(false)
  }
  function removeWidget(id: string) {
    setPanels(p => ({ ...p, [activeTab]: (p[activeTab] ?? []).filter(x => x !== id) }))
  }
  function addWidget(id: string) {
    setPanels(p => {
      const cur = p[activeTab] ?? []
      return { ...p, [activeTab]: cur.includes(id) ? cur : [...cur, id] }
    })
    if (id === 'metricas' && !widgetWidths[id]) setWidgetWidths(w => ({ ...w, [id]: 2 }))
  }
  async function addPanel() {
    const name = (await promptDialog('Nombre del nuevo panel:', '', { placeholder: 'Ej: Marketing' }))?.trim()
    if (!name) return
    const key = name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2, 6)
    setTabs(t => [...t, { key, label: name, icon: '🗂️' }])
    setPanels(p => ({ ...p, [key]: [] }))
    setActiveTab(key)
    if (!editMode) setEditMode(true)
  }
  async function removePanel(key: string) {
    if (tabs.length <= 1) return
    if (!await confirmDialog('¿Eliminar este panel y sus widgets?', { danger: true, confirmLabel: 'Eliminar' })) return
    const next = tabs.filter(t => t.key !== key)
    setTabs(next)
    setPanels(p => { const c = { ...p }; delete c[key]; return c })
    if (activeTab === key) setActiveTab(next[0].key)
  }
  function setWidgetColor(id: string, color: string) {
    setWidgetColors(c => ({ ...c, [id]: color }))
  }
  function setWidgetSize(id: string, h: number) {
    setWidgetSizes(s => ({ ...s, [id]: h }))
  }
  function toggleWidgetWidth(id: string) {
    setWidgetWidths(w => {
      const cur = w[id] ?? 1
      const next = cur >= 2 ? 1 : 2
      return { ...w, [id]: next as 1 | 2 }
    })
  }

  // Drag handlers
  function handleDragStart(id: string) { setDragging(id) }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault(); setDragOver(id)
  }
  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragging || dragging === targetId) { setDragging(null); setDragOver(null); return }
    const newOrder = [...widgetOrder]
    const fromIdx = newOrder.indexOf(dragging)
    const toIdx = newOrder.indexOf(targetId)
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, dragging)
    setPanels(p => ({ ...p, [activeTab]: newOrder }))
    setDragging(null); setDragOver(null)
  }

  // Data fetching
  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000)
    createClient().auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''))

    fetch('/api/dashboard/fx').then(r => r.json()).then(d => {
      if (!d.error) setFx({ pen: d.pen, eur: d.eur, buy: d.pen * 0.998, sell: d.pen * 1.002, updated: d.updated })
    }).catch(() => {})

    const fetchW = async (lat: number, lon: number, place: string) => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`)
        const d = await r.json(); const c = d.current; const dy = d.daily
        setWeather({ temp: Math.round(c.temperature_2m), humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m), uv: Math.round(c.uv_index ?? 0), code: c.weather_code, place, max: Math.round(dy?.temperature_2m_max?.[0] ?? c.temperature_2m + 2), min: Math.round(dy?.temperature_2m_min?.[0] ?? c.temperature_2m - 2) })
      } catch { /**/ }
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => fetchW(p.coords.latitude, p.coords.longitude, 'Mi ubicación'),
        () => fetchW(-12.0464, -77.0428, 'Lima'), { timeout: 6000 }
      )
    } else fetchW(-12.0464, -77.0428, 'Lima')

    fetch('/api/cotizaciones').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        const ap = d.filter((c: {estado:string;total:number}) => c.estado === 'aprobada')
        setCotStats({ total: d.length, aprobadas: ap.length, enviadas: d.filter((c:{estado:string}) => c.estado === 'enviada').length, monto: ap.reduce((s:number,c:{total:number}) => s+c.total, 0) })
      }
    }).catch(() => {})

    fetch('/api/contactos').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : (d.data ?? [])
      setTotalContacts(arr.length)
      const ciudades = arr.reduce((acc:Record<string,number>, c:{ciudad?:string;distrito?:string}) => {
        const k = c.ciudad || c.distrito || 'Sin ciudad'; acc[k] = (acc[k]||0)+1; return acc
      }, {})
      setTopCiudades((Object.entries(ciudades) as [string,number][]).sort((a,b)=>b[1]-a[1]).slice(0,3))
    }).catch(() => {})

    setMensajes([
      { de: 'María García',    asunto: 'Consulta cortinas para sala',   fecha: 'Hoy',     leido: false },
      { de: 'Carlos López',    asunto: 'Presupuesto oficinas',          fecha: 'Ayer',    leido: true },
      { de: 'Ana Torres',      asunto: 'Seguimiento pedido persianas',  fecha: '2 días',  leido: true },
    ])

    return () => clearInterval(tick)
  }, [])

  const hora = time.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const fechaLarga = time.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const greeting = time.getHours() < 12 ? '¡Buenos días' : time.getHours() < 18 ? '¡Buenas tardes' : '¡Buenas noches'
  const greetEmoji = time.getHours() < 12 ? '☀️' : time.getHours() < 18 ? '🌤️' : '🌙'
  const userName = userEmail ? userEmail.split('@')[0].split('.').map((w:string)=>w.toUpperCase()).join(' ') : 'USUARIO'
  const apprPct = cotStats.total > 0 ? Math.round((cotStats.aprobadas/cotStats.total)*100) : 0
  const pct = parseFloat(activePct)||0
  const base = parseFloat(pctBase)||0
  const pctResult = (pct/100)*base

  // Widget render map
  const WIDGETS: Record<string, React.ReactNode> = {
    saludo: (
      <div className="h-full flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{greeting}, {userName}! {greetEmoji}</h2>
        <p className="text-xs text-gray-500 mb-4">Gestiona tus proyectos de decoración con datos en tiempo real</p>
        <div className="flex flex-col gap-2 mt-auto">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
            <span className="text-gray-400 text-sm">⏰</span>
            <span className="font-mono font-bold text-gray-800 text-base tracking-wide">{hora}</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
            <span className="text-gray-400 text-sm">📅</span>
            <span className="text-sm text-gray-600 capitalize">{fechaLarga}</span>
          </div>
        </div>
      </div>
    ),
    calendario: <MiniCalendar />,
    geo: (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400">Distribución geográfica</span>
          <Link href="/geo" className="text-xs text-brand hover:underline">Ver mapa completo →</Link>
        </div>
        <div className="rounded-xl overflow-hidden mb-3 flex-shrink-0">
          <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-77.2,-12.2,-76.8,-11.8&layer=mapnik"
            width="100%" height="120" style={{ border: 0 }} title="Mapa" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600">Top Ubicaciones</p>
          {(topCiudades.length > 0 ? topCiudades : [['Lima',77.8],['Tumbes',11.1],['Lambayeque',11.1]] as [string,number][]).map(([ciudad,count]) => (
            <div key={ciudad}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-700 font-medium">{ciudad}</span>
                <span className="text-gray-400">{totalContacts > 0 ? Math.round((count as number)/totalContacts*100) : (count as number).toFixed ? count.toFixed(1) : count}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${totalContacts > 0 ? (count as number)/totalContacts*100 : count}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    comunicacion: (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span>Bandeja de entrada</span>
          {mensajes.some(m => !m.leido) ? (
            <span className="text-brand font-semibold">{mensajes.filter(m => !m.leido).length} sin leer</span>
          ) : (
            <span className="text-green-500 font-semibold">Al día</span>
          )}
        </div>
        <div className="space-y-2 flex-1">
          {mensajes.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-6">Sin mensajes aún</p>
          ) : mensajes.map((m,i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-brand">{m.de.slice(0,2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs truncate', !m.leido ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>{m.de}</p>
                <p className="text-[10px] text-gray-400 truncate">{m.asunto}</p>
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">{m.fecha}</span>
            </div>
          ))}
        </div>
        <Link href="/comunicacion/bandeja" className="text-xs text-brand hover:underline flex items-center gap-1 mt-3">
          Ver bandeja <ArrowRight size={10} />
        </Link>
      </div>
    ),
    cotizaciones: (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Tasa de aprobación</span>
          <Link href="/finanzas/cotizaciones" className="text-xs text-brand hover:underline">Ver todas →</Link>
        </div>
        <CircularGauge pct={apprPct} color="#16a34a" />
        <div className="flex justify-center gap-4 text-xs mt-2 mb-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Aprobadas {apprPct}%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Enviadas {cotStats.total>0?Math.round(cotStats.enviadas/cotStats.total*100):0}%</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          {[{label:'Total',value:cotStats.total},{label:'Aprobadas',value:cotStats.aprobadas},{label:'Enviadas',value:cotStats.enviadas}].map(s=>(
            <div key={s.label} className="bg-gray-50 rounded-xl py-2">
              <p className="text-lg font-bold text-gray-800">{s.value}</p>
              <p className="text-[10px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 mt-auto">
          <span className="text-xs text-gray-500">Monto aprobado</span>
          <span className="font-bold text-green-600 text-sm">S/ {cotStats.monto.toFixed(2)}</span>
        </div>
      </div>
    ),
    clima: (
      <div className="h-full flex flex-col">
        {weather ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                🌿 {weather.place}
              </div>
              <span className="text-3xl">{WEATHER_ICON[weather.code]??'🌡️'}</span>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-0.5">{weather.temp}°</p>
            <p className="text-sm text-gray-500 mb-0.5">{WEATHER_DESC[weather.code]??'—'}</p>
            <p className="text-xs text-gray-400 mb-1">Máx {weather.max}° · Mín {weather.min}°</p>
            <p className="text-xs text-gray-400 mb-4 flex items-center gap-1"><MapPin size={10}/>Villa El Salvador, Lima, Perú</p>
            <div className="grid grid-cols-3 gap-2 text-center mt-auto">
              {[{e:'💧',l:'Humedad',v:`${weather.humidity}%`},{e:'💨',l:'km/h',v:weather.wind},{e:'☀️',l:'UV',v:weather.uv}].map(s=>(
                <div key={s.l} className="bg-gray-50 rounded-xl py-2">
                  <p className="text-base mb-0.5">{s.e}</p>
                  <p className="text-sm font-bold text-gray-800">{s.v}</p>
                  <p className="text-[10px] text-gray-400">{s.l}</p>
                </div>
              ))}
            </div>
            <Link href="#" className="text-xs text-brand hover:underline flex items-center gap-1 mt-3">Clima completo →</Link>
          </>
        ) : <div className="flex-1 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-300"/></div>}
      </div>
    ),
    fx: (
      <div className="h-full flex flex-col">
        <div className="bg-green-600 rounded-xl p-4 mb-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">$ Tipo de cambio (Perú)</span>
            <span className="text-xs text-green-200">📅 {new Date().toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'})}</span>
          </div>
          <p className="text-xs text-green-200 mb-3">1 USD → Soles</p>
          {fx ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-700/60 rounded-lg p-2.5">
                <p className="text-xs text-green-200 mb-0.5">Compra</p>
                <p className="text-xl font-bold">S/ {fx.buy.toFixed(4)}</p>
              </div>
              <div className="bg-green-700/60 rounded-lg p-2.5">
                <p className="text-xs text-green-200 mb-0.5">Venta</p>
                <p className="text-xl font-bold">S/ {fx.sell.toFixed(4)}</p>
              </div>
            </div>
          ) : <Loader2 size={18} className="animate-spin text-white/60"/>}
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Calculadora de cambio</span>
            <span className="text-gray-400">USD → S/</span>
          </div>
          <input type="number" value={fxInput} onChange={e=>setFxInput(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 mb-2"/>
          {fx && (
            <div className="bg-green-600 text-white rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold">S/ {(parseFloat(fxInput||'0')*fx.pen).toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>
    ),
    calculadora: (
      <div className="h-full flex flex-col">
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">Monto base</label>
          <input type="number" value={pctBase} onChange={e=>setPctBase(e.target.value)} placeholder="0.00"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"/>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['5','10','15','18','20','30','50'].map(p=>(
            <button key={p} onClick={()=>setActivePct(p)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                activePct===p?'bg-brand text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{p}%</button>
          ))}
        </div>
        <input type="number" value={pctCustom} onChange={e=>{setPctCustom(e.target.value);setActivePct(e.target.value)}}
          placeholder="% personalizado"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 mb-3"/>
        <div className="bg-green-600 text-white rounded-xl px-4 py-3 mt-auto">
          <p className="text-xs text-green-200 mb-0.5">{activePct}% de {base||0}</p>
          <p className="text-2xl font-bold">{pctResult.toFixed(2)}</p>
          <div className="flex gap-4 mt-1 text-xs text-green-200">
            <span>+ {activePct}% = {(base+pctResult).toFixed(2)}</span>
            <span>− {activePct}% = {(base-pctResult).toFixed(2)}</span>
          </div>
        </div>
      </div>
    ),
    notas: <NotasWidget />,
    accesos: (
      <div className="grid grid-cols-2 gap-2">
        {[
          { href:'/bot-ia',                emoji:'🤖', label:'BOT IA' },
          { href:'/contactos',             emoji:'👥', label:'Contactos' },
          { href:'/finanzas/cotizaciones', emoji:'📄', label:'Cotizaciones' },
          { href:'/proyectos',             emoji:'🏗️', label:'Proyectos' },
          { href:'/almacen/inventario',    emoji:'📦', label:'Inventario' },
          { href:'/comunicacion/bandeja',  emoji:'📬', label:'Bandeja' },
          { href:'/kanban',                emoji:'📋', label:'Kanban' },
          { href:'/calendar',              emoji:'📅', label:'Calendario' },
        ].map(q=>(
          <Link key={q.href} href={q.href}
            className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-2.5 py-2 hover:bg-gray-50 hover:border-brand/30 transition group">
            <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 truncate">{q.label}</span>
            <span className="text-sm shrink-0">{q.emoji}</span>
          </Link>
        ))}
      </div>
    ),
    metricas: <MetricasWidget />,
  }

  const WIDGET_META: Record<string,{title:string;icon:string;category:string}> = {
    saludo:      { title: 'Saludo y reloj',            icon: '⏱️', category: 'General' },
    calendario:  { title: 'Calendario 30 días',        icon: '📅', category: 'Calendario' },
    geo:         { title: 'Geolocalización Comercial', icon: '📍', category: 'Geolocalización' },
    comunicacion:{ title: 'Comunicación',              icon: '💬', category: 'Comunicación' },
    cotizaciones:{ title: 'Cotizaciones',              icon: '📄', category: 'Finanzas' },
    clima:       { title: 'Clima',                     icon: '🌤️', category: 'General' },
    fx:          { title: 'Tipo de cambio',            icon: '$',  category: 'Finanzas' },
    calculadora: { title: 'Calculadora de %',          icon: '⚡', category: 'Finanzas' },
    notas:       { title: 'Notas rápidas',             icon: '📋', category: 'General' },
    accesos:     { title: 'Accesos rápidos',           icon: '⚡', category: 'General' },
    metricas:    { title: 'Métricas del CRM',          icon: '📊', category: 'General' },
  }
  const CATALOG_CATEGORIES = Array.from(new Set(Object.values(WIDGET_META).map(m => m.category)))

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* Top action bar */}
      <div className="bg-white border-b border-gray-100 px-3 sm:px-6 py-2 flex items-center gap-2 sticky top-0 z-40">
        {/* Tabs (scroll horizontal en móvil) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
          {tabs.map(tab=>(
            <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
              className={cn('flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 group',
                activeTab===tab.key?'bg-brand text-white':'text-gray-500 hover:bg-gray-100')}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {editMode && tabs.length > 1 && (
                <span onClick={e=>{e.stopPropagation(); removePanel(tab.key)}}
                  className={cn('ml-0.5 rounded p-0.5 transition',
                    activeTab===tab.key?'hover:bg-white/20':'hover:bg-gray-200')}>
                  <X size={10}/>
                </span>
              )}
            </button>
          ))}
          <button onClick={addPanel} title="Nuevo panel"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition text-sm font-bold shrink-0">+</button>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 shrink-0">
          {editMode ? (
            <>
              <button onClick={()=>setShowCatalog(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-xl text-xs font-semibold bg-brand text-white hover:opacity-90 transition">
                <Plus size={12}/> <span className="hidden sm:inline">Widget</span>
              </button>
              <button onClick={cancelEdit}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                <X size={12}/> <span className="hidden sm:inline">Cancelar</span>
              </button>
              <button onClick={saveLayout}
                className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-xl text-xs font-semibold bg-green-600 text-white hover:opacity-90 transition">
                <Check size={12}/> <span className="hidden sm:inline">Listo</span>
              </button>
            </>
          ) : (
            <button onClick={()=>setEditMode(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              <Pencil size={12}/> <span className="hidden sm:inline">Editar</span>
            </button>
          )}
        </div>
      </div>

      {/* Edit mode hint */}
      {editMode && (
        <div className="bg-brand/5 border-b border-brand/10 px-4 sm:px-6 py-2 flex items-center gap-2">
          <Settings2 size={13} className="text-brand shrink-0"/>
          <span className="text-[11px] sm:text-xs text-brand font-medium">
            Editando <strong>{tabs.find(t=>t.key===activeTab)?.label}</strong> — arrastra para reordenar, elige color, redimensiona desde la esquina, o pulsa <span className="inline-flex"><Plus size={11}/></span> Widget para añadir por categoría
          </span>
        </div>
      )}

      {/* Widget grid */}
      <div className="p-4 sm:p-6">
        {widgetOrder.length === 0 && !editMode && (
          <div className="text-center py-20">
            <LayoutPanelTop size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400 mb-3">Este panel no tiene widgets todavía</p>
            <button onClick={()=>{ setEditMode(true); setShowCatalog(true) }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white hover:opacity-90 transition">
              <Plus size={13}/> Agregar widget
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
          {widgetOrder.map(id => {
            const meta = WIDGET_META[id]
            if (!meta) return null
            return (
              <div key={id}
                draggable={editMode}
                onDragStart={()=>handleDragStart(id)}
                onDragOver={e=>handleDragOver(e, id)}
                onDrop={e=>handleDrop(e, id)}
                onDragEnd={()=>{setDragging(null);setDragOver(null)}}
                style={{
                  gridColumn: (widgetWidths[id] ?? 1) > 1 ? `span ${widgetWidths[id]}` : undefined,
                  height: widgetSizes[id] ?? 320,
                }}
                className={cn('transition-all duration-150',
                  dragOver===id && dragging!==id && 'ring-2 ring-brand/50 rounded-2xl scale-[1.01]')}>
                <Widget
                  id={id}
                  title={meta.title}
                  icon={meta.icon}
                  editMode={editMode}
                  color={widgetColors[id]}
                  onColorChange={setWidgetColor}
                  onRemove={removeWidget}
                  isDragging={dragging===id}
                  dragHandleProps={{}}
                  height={widgetSizes[id]}
                  onResized={setWidgetSize}
                  width={widgetWidths[id] ?? 1}
                  onWidthChange={toggleWidgetWidth}
                >
                  {WIDGETS[id]}
                </Widget>
              </div>
            )
          })}
          {editMode && (
            <button onClick={()=>setShowCatalog(true)}
              className="rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand/40 hover:bg-brand/5 transition flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-brand min-h-[120px]">
              <Plus size={22} />
              <span className="text-xs font-semibold">Agregar widget</span>
            </button>
          )}
        </div>
      </div>

      {/* Widget catalog modal */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={()=>setShowCatalog(false)}>
          <div onClick={e=>e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <p className="font-semibold text-gray-900 flex items-center gap-2"><LayoutPanelTop size={16} className="text-brand"/> Agregar widget</p>
              <button onClick={()=>setShowCatalog(false)} className="text-gray-400 hover:text-gray-700 transition"><X size={16}/></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-5">
              {CATALOG_CATEGORIES.map(cat => (
                <div key={cat}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat}</p>
                  <div className="space-y-1.5">
                    {Object.entries(WIDGET_META).filter(([,m])=>m.category===cat).map(([id,m]) => {
                      const added = widgetOrder.includes(id)
                      return (
                        <div key={id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition">
                          <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">{m.icon}</span>
                          <span className="flex-1 text-sm text-gray-700 font-medium">{m.title}</span>
                          <button onClick={()=>added ? removeWidget(id) : addWidget(id)}
                            className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg transition',
                              added ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500' : 'bg-brand text-white hover:opacity-90')}>
                            {added ? 'Quitar' : 'Agregar'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
