'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

// CRM-CLUDE no distingue roles de solo-lectura en este módulo.
export function useCanWrite() { return true }

export function StatusBadge({ label, cls }: { label: string; cls?: string }) {
  return <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cls ?? 'bg-gray-100 text-gray-600')}>{label}</span>
}

export function KpiCard({ label, value, icon, color = '#0d9488', sub }: {
  label: string; value: string | number; icon?: React.ReactNode; color?: string; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 flex items-center gap-3 p-4">
      {icon && (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '18', color }}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? 'Buscar...'}
        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
    </div>
  )
}

export function FormField({ label, required, children, className }: {
  label: string; required?: boolean; children: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <label className="text-[12px] font-medium text-gray-600 block mb-0.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

export const inputCls = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white'

export function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string; icon?: React.ElementType }[]; active: string; onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1 border-b border-gray-100 px-1 overflow-x-auto">
      {tabs.map(t => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          className={cn('flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
            active === t.id ? 'border-brand text-brand' : 'border-transparent text-gray-400 hover:text-gray-600')}>
          {t.icon && <t.icon size={13} />}{t.label}
        </button>
      ))}
    </div>
  )
}

export function IconInput({ icon: Icon, className, ...props }: { icon?: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />}
      <input {...props} className={cn(inputCls, Icon && 'pl-8', className)} />
    </div>
  )
}
