import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  label: string
  value: string | number
  delta?: string
  positive?: boolean
  iconBg?: string
}

export default function MetricCard({ icon: Icon, label, value, delta, positive, iconBg = 'bg-brand/10' }: Props) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon size={16} className="text-brand" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {delta && (
          <span className={cn(
            'text-xs font-semibold px-1.5 py-0.5 rounded-full mb-1',
            positive === true ? 'bg-green-50 text-green-600' : positive === false ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'
          )}>
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}
