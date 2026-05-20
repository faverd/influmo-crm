'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, MessageSquare, Flame, TrendingUp, Snowflake } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Contact {
  id: string
  phone: string
  name: string | null
  lead_score: 'hot' | 'warm' | 'cold' | null
  last_message_at: string | null
  message_count: number
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())

  useEffect(() => {
    fetch('/api/conversations').then(r => r.json()).then(setContacts)
  }, [])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // Group contacts by day of last message
  const contactsByDay: Record<number, Contact[]> = {}
  contacts.forEach(c => {
    if (!c.last_message_at) return
    const d = new Date(c.last_message_at)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!contactsByDay[day]) contactsByDay[day] = []
      contactsByDay[day].push(c)
    }
  })

  const selectedContacts = selectedDay ? (contactsByDay[selectedDay] ?? []) : []

  const scoreIcon = (score: string | null) => {
    if (score === 'hot') return <Flame size={12} className="text-red-500" />
    if (score === 'warm') return <TrendingUp size={12} className="text-amber-500" />
    return <Snowflake size={12} className="text-gray-400" />
  }

  return (
    <div className="p-6 h-screen flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="text-sm text-gray-500 mt-0.5">Actividad de contactos por día</p>
        </div>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Calendar grid */}
        <div className="card flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {MONTHS[month]} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate()) }}
                className="px-3 py-1.5 text-xs font-medium text-brand border border-brand/30 rounded-lg hover:bg-brand-light transition-colors"
              >
                Hoy
              </button>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 flex-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const isSelected = day === selectedDay
              const dayContacts = contactsByDay[day] ?? []
              const hasActivity = dayContacts.length > 0

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={cn(
                    'relative rounded-xl p-1.5 flex flex-col items-center gap-0.5 transition-all hover:bg-gray-50 min-h-[56px]',
                    isSelected && 'bg-brand/10 ring-1 ring-brand',
                    isToday && !isSelected && 'ring-1 ring-brand/40'
                  )}
                >
                  <span className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                    isToday ? 'bg-brand text-white' : isSelected ? 'text-brand font-bold' : 'text-gray-700'
                  )}>
                    {day}
                  </span>
                  {hasActivity && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {dayContacts.slice(0, 3).map(c => (
                        <span
                          key={c.id}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            c.lead_score === 'hot' ? 'bg-red-400' :
                            c.lead_score === 'warm' ? 'bg-amber-400' : 'bg-gray-300'
                          )}
                        />
                      ))}
                      {dayContacts.length > 3 && <span className="text-[9px] text-gray-400">+{dayContacts.length - 3}</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> HOT</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> WARM</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> COLD</span>
          </div>
        </div>

        {/* Day detail panel */}
        <div className="w-72 card flex flex-col">
          <h3 className="font-semibold text-gray-900 mb-4">
            {selectedDay
              ? `${selectedDay} de ${MONTHS[month]}`
              : 'Selecciona un día'}
          </h3>
          {selectedDay ? (
            selectedContacts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <MessageSquare size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Sin actividad este día</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto">
                {selectedContacts.map(c => (
                  <Link
                    key={c.id}
                    href={`/conversations/${c.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center shrink-0">
                      <span className="text-brand text-xs font-bold">
                        {(c.name || c.phone).slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name || c.phone}</p>
                      <p className="text-xs text-gray-400">{c.message_count} mensajes</p>
                    </div>
                    {scoreIcon(c.lead_score)}
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400 text-center">Haz clic en un día para ver los contactos activos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
