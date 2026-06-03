'use client'

import { useState, useEffect } from 'react'
import {
  Plus, X, Check, Trash2, ChevronLeft, ChevronRight, CalendarIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  addMonths, subMonths, isToday, parseISO, startOfWeek, endOfWeek, addDays,
  addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

export interface CalEvent {
  id: string; title: string; date: string; endDate?: string
  time?: string; endTime?: string; allDay?: boolean
  description?: string; location?: string; color?: string; recurrence?: string
  emoji?: string
}

const EVENT_EMOJIS = ['📌','📅','🎯','💼','📞','✅','🔔','📝','🚀','💡','🎉','⭐','📍','🍽️','✈️','🏥','💰','📦','🎤','🌱','🛠️','📊','💬','🔥']
const EVENT_COLORS = ['#0d9488','#1a5c34','#16a34a','#2563eb','#dc2626','#ea580c','#7c3aed','#374151']

function EventModal({ initial, onSave, onDelete, onClose }: {
  initial?: Partial<CalEvent>
  onSave: (ev: CalEvent) => void
  onDelete?: (id: string) => void
  onClose: () => void
}) {
  const isEditing = !!initial?.id
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    date: initial?.date ?? today,
    endDate: initial?.endDate ?? initial?.date ?? today,
    time: initial?.time ?? '09:00',
    endTime: initial?.endTime ?? '10:00',
    allDay: initial?.allDay ?? false,
    description: initial?.description ?? '',
    location: initial?.location ?? '',
    color: initial?.color ?? EVENT_COLORS[0],
    recurrence: initial?.recurrence ?? 'none',
    emoji: initial?.emoji ?? '📌',
  })
  const [showEmojis, setShowEmojis] = useState(false)
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    if (!form.title.trim()) return
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: form.title,
      date: form.date,
      endDate: form.endDate,
      time: form.allDay ? undefined : form.time,
      endTime: form.allDay ? undefined : form.endTime,
      allDay: form.allDay,
      description: form.description,
      location: form.location,
      color: form.color,
      recurrence: form.recurrence,
      emoji: form.emoji,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-gray-900">{isEditing ? 'Editar evento' : 'Nuevo evento'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Title + Emoji */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Título *</label>
            <div className="flex gap-2 items-end">
              <div className="relative">
                <button type="button" onClick={() => setShowEmojis(s => !s)}
                  className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-xl hover:bg-gray-100 transition-colors">
                  {form.emoji}
                </button>
                {showEmojis && (
                  <div className="absolute top-12 left-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-6 gap-1 w-64">
                    {EVENT_EMOJIS.map(em => (
                      <button key={em} type="button"
                        onClick={() => { set('emoji', em); setShowEmojis(false) }}
                        className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-lg transition-colors">
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="Ej: Reunión de equipo"
                className="flex-1 bg-gray-50 border-0 border-b-2 border-gray-200 focus:border-brand px-2 py-2 text-sm focus:outline-none focus:bg-white transition-colors rounded-none" />
            </div>
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Inicio *</label>
              <input type={form.allDay ? 'date' : 'datetime-local'}
                value={form.allDay ? form.date : `${form.date}T${form.time}`}
                onChange={e => {
                  if (form.allDay) { set('date', e.target.value) }
                  else { const [d, t] = e.target.value.split('T'); set('date', d); set('time', t) }
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Fin</label>
              <input type={form.allDay ? 'date' : 'datetime-local'}
                value={form.allDay ? form.endDate : `${form.endDate}T${form.endTime}`}
                onChange={e => {
                  if (form.allDay) { set('endDate', e.target.value) }
                  else { const [d, t] = e.target.value.split('T'); set('endDate', d); set('endTime', t) }
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white" />
            </div>
          </div>

          {/* All day */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.allDay} onChange={e => set('allDay', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand accent-brand" />
            <span className="text-sm text-gray-700">Todo el día</span>
          </label>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Descripción</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Descripción opcional"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none bg-gray-50" />
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Ubicación</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 text-xs">📍</span>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="Lugar o enlace de reunión"
                className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-gray-50" />
            </div>
          </div>

          {/* Color + Recurrence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Color</label>
              <div className="flex gap-1.5 flex-wrap">
                {EVENT_COLORS.map(c => (
                  <button key={c} onClick={() => set('color', c)}
                    style={{ backgroundColor: c }}
                    className={cn('w-7 h-7 rounded-full transition-all hover:scale-110',
                      form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : '')} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Recurrencia</label>
              <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white">
                <option value="none">Sin recurrencia</option>
                <option value="daily">Cada día</option>
                <option value="weekly">Cada semana</option>
                <option value="monthly">Cada mes</option>
                <option value="yearly">Cada año</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2">
          {isEditing && onDelete && (
            <button onClick={() => { onDelete(initial!.id!); onClose() }}
              className="px-4 py-3 border border-red-200 text-red-500 rounded-2xl text-sm font-semibold hover:bg-red-50 flex items-center justify-center gap-1.5">
              <Trash2 size={15} /> Eliminar
            </button>
          )}
          <button onClick={handleSave} disabled={!form.title.trim()}
            className="flex-1 py-3 bg-brand text-white rounded-2xl text-sm font-semibold hover:bg-brand/90 disabled:opacity-40 flex items-center justify-center gap-2">
            <Check size={15} /> {isEditing ? 'Guardar cambios' : 'Crear evento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Event Chip (tinted bg + colored left border, multi-line) ──────────────────

function EventChip({ ev, variant, onOpen, onDelete }: {
  ev: CalEvent
  variant: 'month' | 'timed'
  onOpen: (ev: CalEvent) => void
  onDelete: (id: string) => void
}) {
  const color = ev.color ?? '#0d9488'
  return (
    <div
      onClick={e => { e.stopPropagation(); onOpen(ev) }}
      className={cn(
        'group/ev relative cursor-pointer rounded-md overflow-hidden transition-all hover:shadow-sm',
        variant === 'month' ? 'px-1.5 py-1' : 'px-2 py-1.5 mb-0.5'
      )}
      style={{ backgroundColor: color + '18', borderLeft: `3px solid ${color}` }}
    >
      {/* Time + emoji */}
      {!ev.allDay && ev.time && (
        <p className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color }}>
          {ev.time} {ev.emoji && <span>{ev.emoji}</span>}
        </p>
      )}
      {ev.allDay && ev.emoji && (
        <p className="text-[10px]" style={{ color }}>{ev.emoji}</p>
      )}
      {/* Title — wraps to multiple lines */}
      <p className={cn('font-medium leading-tight break-words',
        variant === 'month' ? 'text-[10px] line-clamp-2' : 'text-[11px] line-clamp-3'
      )} style={{ color: color }}>
        {(ev.allDay && ev.emoji && !ev.time) ? null : null}{ev.title}
      </p>
      {/* Location (timed only) */}
      {variant === 'timed' && ev.location && (
        <p className="text-[9px] opacity-70 truncate mt-0.5" style={{ color }}>📍 {ev.location}</p>
      )}
      {/* Delete on hover */}
      <button onClick={e => { e.stopPropagation(); onDelete(ev.id) }}
        className="absolute top-0.5 right-0.5 opacity-0 group-hover/ev:opacity-100 transition-opacity rounded p-0.5 hover:bg-black/10"
        style={{ color }}>
        <X size={9} />
      </button>
    </div>
  )
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────

export default function FullCalendar({ storageKey = 'cal_events' }: { storageKey?: string }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Partial<CalEvent> | undefined>()
  const [viewMode, setViewMode] = useState<'mes' | 'semana' | 'dia'>('mes')

  // Load from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setEvents(JSON.parse(saved))
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  // Persist to localStorage whenever events change (after initial load)
  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(storageKey, JSON.stringify(events)) } catch { /* ignore */ }
  }, [events, loaded])

  const WEEK_DAYS_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
  const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7am–9pm

  function getEventsForDay(date: Date) {
    const d = format(date, 'yyyy-MM-dd')
    return events.filter(e => e.date === d)
  }

  function saveEvent(ev: CalEvent) {
    setEvents(prev => {
      const exists = prev.some(e => e.id === ev.id)
      return exists ? prev.map(e => e.id === ev.id ? ev : e) : [...prev, ev]
    })
    setShowModal(false)
    setEditingEvent(undefined)
  }

  function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  function openNewEvent(date?: Date) {
    setEditingEvent(date ? { date: format(date, 'yyyy-MM-dd') } : undefined)
    setShowModal(true)
  }

  function openEvent(ev: CalEvent) {
    setEditingEvent(ev)
    setShowModal(true)
  }

  // Navigation helpers
  function navPrev() {
    if (viewMode === 'mes') setCurrentDate(d => subMonths(d, 1))
    else if (viewMode === 'semana') setCurrentDate(d => subWeeks(d, 1))
    else setCurrentDate(d => addDays(d, -1))
  }
  function navNext() {
    if (viewMode === 'mes') setCurrentDate(d => addMonths(d, 1))
    else if (viewMode === 'semana') setCurrentDate(d => addWeeks(d, 1))
    else setCurrentDate(d => addDays(d, 1))
  }

  // Title based on view
  function getTitle() {
    if (viewMode === 'mes') return format(currentDate, 'MMMM yyyy', { locale: es })
    if (viewMode === 'semana') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 })
      const we = endOfWeek(currentDate, { weekStartsOn: 0 })
      return `${format(ws, 'd MMM', { locale: es })} – ${format(we, 'd MMM yyyy', { locale: es })}`
    }
    return format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es })
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  // Today's events: exact date match
  const todayEvents = events.filter(e => e.date === todayStr)
  // Upcoming: same day or future, sorted by date+time
  const upcomingEvents = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => (a.date + (a.time ?? '00:00')).localeCompare(b.date + (b.time ?? '00:00')))
    .slice(0, 8)

  // ── Month view ──────────────────────────────────────────────────────────────
  function MonthView() {
    const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
    const startDow = startOfMonth(currentDate).getDay()
    return (
      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-t border-gray-100">
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`e${i}`} className="border-r border-b border-gray-100 min-h-[120px] bg-gray-50/50" />
          ))}
          {days.map(day => {
            const dayEvs = getEventsForDay(day)
            const isT = isToday(day)
            const inMonth = isSameMonth(day, currentDate)
            return (
              <div key={day.toISOString()} onClick={() => openNewEvent(day)}
                className={cn('border-r border-b border-gray-100 min-h-[120px] p-1.5 cursor-pointer hover:bg-blue-50/30 transition-colors relative group',
                  !inMonth && 'opacity-40 bg-gray-50/50')}>
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 mx-auto',
                  isT ? 'bg-brand text-white' : 'text-gray-600 group-hover:bg-gray-100')}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvs.slice(0, 3).map(ev => (
                    <EventChip key={ev.id} ev={ev} variant="month" onOpen={openEvent} onDelete={deleteEvent} />
                  ))}
                  {dayEvs.length > 3 && (
                    <p className="text-[9px] text-gray-400 pl-1">+{dayEvs.length - 3} más</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Week view ───────────────────────────────────────────────────────────────
  function WeekView() {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    return (
      <div className="flex-1 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="text-xs text-gray-400 p-2 text-center">GMT-5</div>
          {weekDays.map(day => (
            <div key={day.toISOString()} onClick={() => openNewEvent(day)}
              className="border-l border-gray-100 p-2 text-center cursor-pointer hover:bg-gray-50">
              <p className="text-xs text-gray-500 uppercase font-medium">{format(day, 'EEE', { locale: es })}</p>
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mx-auto mt-0.5',
                isToday(day) ? 'bg-brand text-white' : 'text-gray-800')}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        {/* All-day / no-time row */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 bg-gray-50/40">
          <div className="text-[9px] text-gray-400 text-right pr-2 pt-1.5">Todo el día</div>
          {weekDays.map(day => {
            const allDayEvs = getEventsForDay(day).filter(e => e.allDay || !e.time)
            return (
              <div key={day.toISOString()} onClick={() => openNewEvent(day)}
                className="border-l border-gray-100 min-h-[28px] p-0.5 cursor-pointer hover:bg-blue-50/20 space-y-0.5">
                {allDayEvs.map(ev => <EventChip key={ev.id} ev={ev} variant="timed" onOpen={openEvent} onDelete={deleteEvent} />)}
              </div>
            )
          })}
        </div>
        {/* Hour rows */}
        <div>
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-50 min-h-[48px]">
              <div className="text-[10px] text-gray-400 text-right pr-2 pt-1 shrink-0 -mt-2">
                {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </div>
              {weekDays.map(day => {
                const dayEvs = getEventsForDay(day).filter(e => !e.allDay && e.time && parseInt(e.time.split(':')[0]) === hour)
                return (
                  <div key={day.toISOString()} onClick={() => openNewEvent(day)}
                    className="border-l border-gray-100 relative cursor-pointer hover:bg-blue-50/20 transition-colors min-h-[48px] p-0.5">
                    {dayEvs.map(ev => (
                      <EventChip key={ev.id} ev={ev} variant="timed" onOpen={openEvent} onDelete={deleteEvent} />
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Day view ────────────────────────────────────────────────────────────────
  function DayView() {
    const dayEvs = getEventsForDay(currentDate)
    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[60px_1fr] border-b border-gray-100 sticky top-0 bg-white z-10 p-3">
          <div />
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase font-medium">{format(currentDate, 'EEE', { locale: es })}</p>
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold mx-auto',
              isToday(currentDate) ? 'bg-brand text-white' : 'text-gray-800')}>
              {format(currentDate, 'd')}
            </div>
          </div>
        </div>
        {/* All-day / no-time row */}
        {dayEvs.filter(e => e.allDay || !e.time).length > 0 && (
          <div className="grid grid-cols-[60px_1fr] border-b border-gray-100 bg-gray-50/40">
            <div className="text-[10px] text-gray-400 text-right pr-2 pt-2">Todo el día</div>
            <div className="border-l border-gray-100 p-2 space-y-1">
              {dayEvs.filter(e => e.allDay || !e.time).map(ev => {
                const color = ev.color ?? '#0d9488'
                return (
                  <div key={ev.id} onClick={e => { e.stopPropagation(); openEvent(ev) }}
                    className="rounded-lg px-3 py-2 text-xs shadow-sm relative group/ev cursor-pointer"
                    style={{ backgroundColor: color + '18', borderLeft: `3px solid ${color}` }}>
                    <button onClick={e => { e.stopPropagation(); deleteEvent(ev.id) }}
                      className="absolute top-1 right-1 opacity-0 group-hover/ev:opacity-100 rounded p-0.5 hover:bg-black/10" style={{ color }}>
                      <X size={10} />
                    </button>
                    <p className="font-bold pr-4 flex items-center gap-1" style={{ color }}>{ev.emoji && <span>{ev.emoji}</span>}{ev.title}</p>
                    {ev.location && <p className="text-[10px] opacity-70 truncate" style={{ color }}>📍 {ev.location}</p>}
                    {ev.description && <p className="text-[10px] opacity-70 mt-0.5 line-clamp-2" style={{ color }}>{ev.description}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {HOURS.map(hour => {
          const hourEvs = dayEvs.filter(e => !e.allDay && e.time && parseInt(e.time.split(':')[0]) === hour)
          return (
            <div key={hour} className="grid grid-cols-[60px_1fr] border-b border-gray-50 min-h-[56px]">
              <div className="text-[10px] text-gray-400 text-right pr-2 pt-1 -mt-2">
                {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </div>
              <div onClick={() => openNewEvent(currentDate)}
                className="border-l border-gray-100 relative cursor-pointer hover:bg-blue-50/20 transition-colors px-2 py-0.5">
                {hourEvs.map(ev => {
                  const color = ev.color ?? '#0d9488'
                  return (
                    <div key={ev.id} onClick={e => { e.stopPropagation(); openEvent(ev) }}
                      className="rounded-lg px-3 py-2 mb-1 text-xs shadow-sm relative group/ev cursor-pointer"
                      style={{ backgroundColor: color + '18', borderLeft: `3px solid ${color}` }}>
                      <button onClick={e => { e.stopPropagation(); deleteEvent(ev.id) }}
                        className="absolute top-1 right-1 opacity-0 group-hover/ev:opacity-100 rounded p-0.5 hover:bg-black/10" style={{ color }}>
                        <X size={10} />
                      </button>
                      <p className="font-bold pr-4 flex items-center gap-1" style={{ color }}>
                        {ev.emoji && <span>{ev.emoji}</span>}{ev.title}
                      </p>
                      {ev.time && <p className="text-[10px] opacity-80" style={{ color }}>{ev.time}{ev.endTime ? ` – ${ev.endTime}` : ''}</p>}
                      {ev.location && <p className="text-[10px] opacity-70 truncate" style={{ color }}>📍 {ev.location}</p>}
                      {ev.description && <p className="text-[10px] opacity-70 mt-0.5 line-clamp-2" style={{ color }}>{ev.description}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* Main calendar area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="border-b border-gray-100 px-4 py-2.5 flex items-center gap-3 shrink-0">
          <button onClick={() => { setCurrentDate(new Date()) }}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
            Hoy
          </button>
          <button onClick={navPrev} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={15} />
          </button>
          <button onClick={navNext} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={15} />
          </button>
          <h2 className="font-semibold text-gray-900 text-sm capitalize flex-1">{getTitle()}</h2>

          {/* View switcher */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
            {(['dia', 'semana', 'mes'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={cn('px-3 py-1.5 rounded-md capitalize transition-colors',
                  viewMode === v ? 'bg-white shadow-sm text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-700')}>
                {v === 'dia' ? 'Día' : v === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>

          <button onClick={() => openNewEvent()}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand/90">
            <Plus size={13} /> Nuevo evento
          </button>
        </div>

        {/* View content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === 'mes' && <MonthView />}
          {viewMode === 'semana' && <WeekView />}
          {viewMode === 'dia' && <DayView />}
        </div>
      </div>

      {/* Right sidebar — Today's events */}
      <div className="hidden lg:flex flex-col w-72 border-l border-gray-100 bg-gray-50/50 shrink-0">
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Actividades de hoy · {format(new Date(), 'MMM d, yyyy', { locale: es }).toUpperCase()}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {todayEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Sin eventos hoy</p>
            </div>
          ) : todayEvents.map(ev => (
            <div key={ev.id} onClick={() => openEvent(ev)}
              className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm group cursor-pointer hover:shadow-md transition-all"
              style={{ borderLeft: `3px solid ${ev.color ?? '#0d9488'}` }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                    {ev.emoji && <span>{ev.emoji}</span>}<span className="truncate">{ev.title}</span>
                  </p>
                  {ev.time && <p className="text-xs text-gray-400">{ev.time}{ev.endTime ? ` – ${ev.endTime}` : ''}</p>}
                  {ev.location && <p className="text-xs text-gray-400 truncate">📍 {ev.location}</p>}
                  {ev.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ev.description}</p>}
                </div>
                <button onClick={e => { e.stopPropagation(); deleteEvent(ev.id) }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming */}
        {upcomingEvents.length > 0 && (
          <div className="border-t border-gray-100 p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Próximos</p>
            <div className="space-y-1.5">
              {upcomingEvents.slice(0, 4).map(ev => (
                <div key={ev.id} onClick={() => openEvent(ev)} className="flex items-center gap-2 group cursor-pointer hover:bg-white rounded-lg p-1 -mx-1 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ev.color ?? '#0d9488' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate font-medium">{ev.emoji && <span className="mr-0.5">{ev.emoji}</span>}{ev.title}</p>
                    <p className="text-[10px] text-gray-400">{format(parseISO(ev.date), 'd MMM', { locale: es })}{ev.time ? ` · ${ev.time}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Event Modal */}
      {showModal && (
        <EventModal
          initial={editingEvent}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={() => { setShowModal(false); setEditingEvent(undefined) }}
        />
      )}
    </div>
  )
}
