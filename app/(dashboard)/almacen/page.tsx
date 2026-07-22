'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Boxes, AlertTriangle, ArrowLeftRight, Warehouse, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'

interface Item {
  id: string; nombre: string; categoria: string; unidad: string
  stock_actual: number; stock_minimo: number; precio_venta: number
}
interface Mov { id: string; tipo: string; producto: string; cantidad: number; created_at: string }

export default function AlmacenDashboardPage() {
  const [items, setItems] = useState<Item[]>([])
  const [movs, setMovs] = useState<Mov[]>([])
  const [ubicCount, setUbicCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/inventario').then(r => r.json()).catch(() => []),
      fetch('/api/almacen/movimientos').then(r => r.json()).catch(() => []),
      fetch('/api/almacen/ubicaciones').then(r => r.json()).catch(() => []),
    ]).then(([inv, mv, ub]) => {
      setItems(Array.isArray(inv) ? inv : [])
      setMovs(Array.isArray(mv) ? mv.slice(0, 6) : [])
      setUbicCount(Array.isArray(ub) ? ub.length : 0)
      setLoading(false)
    })
  }, [])

  const totalStock = items.reduce((s, i) => s + (i.stock_actual || 0), 0)
  const valorTotal = items.reduce((s, i) => s + (i.stock_actual || 0) * (i.precio_venta || 0), 0)
  const bajoStock = items.filter(i => i.stock_actual <= i.stock_minimo)

  const cards = [
    { label: 'Productos',       value: items.length,               icon: Boxes,         color: 'text-blue-600 bg-blue-50' },
    { label: 'Stock bajo',      value: bajoStock.length,            icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Movimientos',     value: movs.length,                 icon: ArrowLeftRight,color: 'text-purple-600 bg-purple-50' },
    { label: 'Ubicaciones',     value: ubicCount,                   icon: Warehouse,     color: 'text-teal-600 bg-teal-50' },
  ]

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Almacén</h1>
        <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Panorama general de inventario y movimientos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon size={16} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : c.value}</p>
            <p className="text-xs text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock bajo */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-900 flex items-center gap-2"><AlertTriangle size={15} className="text-red-500" /> Stock bajo</p>
            <Link href="/almacen/inventario" className="text-xs text-brand hover:underline">Ver productos →</Link>
          </div>
          {bajoStock.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Todo el stock está en niveles óptimos</p>
          ) : (
            <div className="space-y-2">
              {bajoStock.slice(0, 6).map(i => (
                <div key={i.id} className="flex items-center justify-between px-3 py-2 bg-red-50/50 rounded-lg">
                  <span className="text-xs font-medium text-gray-700">{i.nombre}</span>
                  <span className="text-xs font-bold text-red-600">{i.stock_actual} {i.unidad} / mín {i.stock_minimo}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Movimientos recientes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-900 flex items-center gap-2"><ArrowLeftRight size={15} className="text-purple-500" /> Movimientos recientes</p>
            <Link href="/almacen/movimientos" className="text-xs text-brand hover:underline">Ver todos →</Link>
          </div>
          {movs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Sin movimientos registrados</p>
          ) : (
            <div className="space-y-2">
              {movs.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition">
                  {m.tipo === 'entrada' ? <TrendingUp size={13} className="text-green-500 shrink-0" /> : <TrendingDown size={13} className="text-red-500 shrink-0" />}
                  <span className="text-xs font-medium text-gray-700 flex-1 truncate">{m.producto}</span>
                  <span className="text-xs text-gray-400">{m.cantidad}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {[
          { href: '/almacen/inventario',  emoji: '📦', label: 'Ver productos' },
          { href: '/almacen/movimientos', emoji: '🔄', label: 'Registrar movimiento' },
          { href: '/almacen/ubicaciones', emoji: '🗂️', label: 'Gestionar ubicaciones' },
        ].map(q => (
          <Link key={q.href} href={q.href}
            className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm hover:border-brand/30 transition group">
            <span className="text-xl">{q.emoji}</span>
            <span className="text-sm font-semibold text-gray-700 flex-1">{q.label}</span>
            <ArrowRight size={14} className="text-gray-300 group-hover:text-brand transition" />
          </Link>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6">Valor total en stock: <strong className="text-gray-600">S/ {valorTotal.toFixed(2)}</strong> · Unidades totales: <strong className="text-gray-600">{totalStock}</strong></p>
    </div>
  )
}
