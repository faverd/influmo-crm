'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { BarChart3, Users, FileText, TrendingUp, Download, FileDown, Activity } from 'lucide-react'
import { RANGOS, type GeoStats, type GeoZona } from '@/lib/geo'
import { downloadAsExcel } from '@/lib/excel-export'

const MapView = dynamic(() => import('@/components/geo/map-view'), { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-gray-100 animate-pulse" /> })

const HEADERS = ['Departamento', 'Contactos', 'Clientes', 'Cotizaciones', 'Ventas', 'Monto (S/)', '% Part.']
const toRow = (z: GeoZona) => [z.departamento, z.contactos, z.clientes, z.cotizaciones, z.ventas, z.monto, `${z.pct}%`]

export default function GeoAnaliticaPage() {
  const [data, setData] = useState<GeoStats | null>(null)
  const [rango, setRango] = useState('todo')

  useEffect(() => {
    fetch(`/api/geo/stats?rango=${rango}`).then(r => r.json()).then(setData).catch(() => setData({ totals: { contactos: 0, clientes: 0, cotizaciones: 0, ventas: 0, monto: 0 }, zonas: [], points: [] }))
  }, [rango])

  const t = data?.totals
  const zonas = useMemo(() => data?.zonas ?? [], [data])
  const ticket = t && t.ventas ? t.monto / t.ventas : 0
  const conv = t && t.cotizaciones ? (t.ventas / t.cotizaciones) * 100 : 0

  const funnel = [
    { l: 'Consultas / Contactos', v: t?.contactos ?? 0, c: '#3b82f6' },
    { l: 'Cotizaciones', v: t?.cotizaciones ?? 0, c: '#d97706' },
    { l: 'Ventas cerradas', v: t?.ventas ?? 0, c: '#16a34a' },
  ]
  const fMax = Math.max(1, ...funnel.map(f => f.v))

  function exportExcel() { downloadAsExcel('analitica-geografica', HEADERS, zonas.map(toRow)) }
  async function exportPdf() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFontSize(16); doc.text('Analítica Geográfica', 14, 18)
    doc.setFontSize(9); doc.setTextColor(120)
    doc.text(`Contactos: ${t?.contactos ?? 0}  ·  Clientes: ${t?.clientes ?? 0}  ·  Cotizaciones: ${t?.cotizaciones ?? 0}  ·  Ventas: ${t?.ventas ?? 0}  ·  Monto: S/ ${(t?.monto ?? 0).toLocaleString('es-PE')}`, 14, 26)
    let y = 40
    doc.setTextColor(30); doc.setFontSize(9)
    HEADERS.forEach((h, i) => doc.text(String(h), 14 + i * 27, y))
    y += 4; doc.setDrawColor(200); doc.line(14, y, 196, y); y += 6
    doc.setTextColor(60)
    for (const z of zonas) {
      toRow(z).forEach((c, i) => doc.text(String(c), 14 + i * 27, y))
      y += 7; if (y > 280) { doc.addPage(); y = 20 }
    }
    doc.save('analitica-geografica.pdf')
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={22} className="text-brand" /> Analítica Geográfica</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">Embudo y rendimiento comercial por ubicación</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={rango} onChange={e => setRango(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">{RANGOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"><Download size={15} /><span className="hidden sm:inline">Excel</span></button>
          <button onClick={exportPdf} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"><FileDown size={15} /><span className="hidden sm:inline">PDF</span></button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        {[
          { l: 'Clientes', v: t?.clientes ?? 0, i: Users, c: '#16a34a' },
          { l: 'Cotizaciones', v: t?.cotizaciones ?? 0, i: FileText, c: '#d97706' },
          { l: 'Ticket promedio', v: `S/ ${ticket.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`, i: TrendingUp, c: '#7c3aed' },
          { l: 'Conversión', v: `${conv.toFixed(1)}%`, i: Activity, c: '#0d9488' },
        ].map(k => (
          <div key={k.l} className="bg-white rounded-xl border border-gray-100 p-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1" style={{ background: k.c + '18', color: k.c }}><k.i size={15} /></div><p className="text-lg font-bold text-gray-900">{k.v}</p><p className="text-[11px] text-gray-400">{k.l}</p></div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Embudo de conversión</h3>
          <div className="space-y-3">
            {funnel.map(f => (
              <div key={f.l}>
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{f.l}</span><span className="font-semibold">{f.v}</span></div>
                <div className="h-6 rounded-lg bg-gray-100 overflow-hidden"><div className="h-full rounded-lg flex items-center justify-end px-2 text-[10px] text-white font-medium transition-all" style={{ width: `${Math.max(8, (f.v / fMax) * 100)}%`, background: f.c }}>{((f.v / fMax) * 100).toFixed(0)}%</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Distribución geográfica</h3>
          <MapView zonas={zonas} mode="heatmap" height={300} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">Rendimiento por departamento</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-400 border-b border-gray-100">
              {HEADERS.map(h => <th key={h} className="py-2 pr-3 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {zonas.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">Sin datos geográficos</td></tr>
                : zonas.map(z => (
                  <tr key={z.departamento} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-gray-800">{z.departamento}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{z.contactos}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{z.clientes}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{z.cotizaciones}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{z.ventas}</td>
                    <td className="py-2.5 pr-3 font-medium text-brand whitespace-nowrap">S/ {z.monto.toLocaleString('es-PE')}</td>
                    <td className="py-2.5 pr-3"><span className="text-xs text-gray-500">{z.pct}%</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
