'use client'

import { useEffect, useState } from 'react'
import MetricCard from '@/components/metric-card'
import {
  Users, MessageSquare, Flame, TrendingUp, Snowflake, Bot,
} from 'lucide-react'

interface DashboardData {
  totalContacts: number
  todayMessages: number
  leads: { hot: number; warm: number; cold: number; total: number }
  chartData: { date: string; user: number; assistant: number }[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData)
  }, [])

  const maxVal = Math.max(...(data?.chartData.map(d => d.user + d.assistant) ?? [1]), 1)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vista general del CRM de WhatsApp</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-[10px] px-3 py-2 text-sm text-gray-600 border border-gray-200 shadow-sm">
          <Bot size={16} className="text-brand" />
          <span className="font-medium">Berta activa</span>
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={Users}
          label="Contactos totales"
          value={data?.totalContacts ?? '—'}
        />
        <MetricCard
          icon={MessageSquare}
          label="Mensajes hoy"
          value={data?.todayMessages ?? '—'}
        />
        <MetricCard
          icon={Flame}
          label="Leads HOT (mes)"
          value={data?.leads.hot ?? '—'}
          iconBg="bg-red-50"
        />
        <MetricCard
          icon={TrendingUp}
          label="Leads WARM (mes)"
          value={data?.leads.warm ?? '—'}
          iconBg="bg-amber-50"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Chart */}
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Mensajes últimos 7 días</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand inline-block"></span>
                Usuario
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-200 inline-block"></span>
                Berta
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-40">
            {(data?.chartData ?? Array(7).fill({ date: '', user: 0, assistant: 0 })).map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: 128 }}>
                  <div
                    className="w-full bg-brand rounded-t-sm"
                    style={{ height: `${(d.user / maxVal) * 100}%`, minHeight: d.user > 0 ? 3 : 0 }}
                  />
                  <div
                    className="w-full bg-blue-200 rounded-t-sm"
                    style={{ height: `${(d.assistant / maxVal) * 100}%`, minHeight: d.assistant > 0 ? 3 : 0 }}
                  />
                </div>
                <span className="text-[9px] text-gray-400">
                  {d.date ? new Date(d.date).getDate() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead distribution */}
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900">Distribución de leads</h2>
          {data ? (
            <>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'HOT', count: data.leads.hot, color: 'bg-red-400', cls: 'text-red-600' },
                  { label: 'WARM', count: data.leads.warm, color: 'bg-amber-400', cls: 'text-amber-600' },
                  { label: 'COLD', count: data.leads.cold, color: 'bg-gray-300', cls: 'text-gray-500' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`font-semibold ${l.cls}`}>{l.label}</span>
                        <span className="text-gray-600">{l.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${l.color}`}
                          style={{ width: data.leads.total > 0 ? `${(l.count / data.leads.total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-gray-100 text-center">
                <p className="text-2xl font-bold text-gray-900">{data.leads.total}</p>
                <p className="text-xs text-gray-500">leads este mes</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
          )}
        </div>
      </div>
    </div>
  )
}
