import { cn } from '@/lib/utils'
import { Flame, TrendingUp, Snowflake } from 'lucide-react'

interface Props {
  score: 'hot' | 'warm' | 'cold' | null
  size?: 'sm' | 'md'
}

export default function LeadBadge({ score, size = 'md' }: Props) {
  if (!score) return null

  const cfg = {
    hot: { icon: Flame, label: 'HOT', cls: 'badge-hot' },
    warm: { icon: TrendingUp, label: 'WARM', cls: 'badge-warm' },
    cold: { icon: Snowflake, label: 'COLD', cls: 'badge-cold' },
  }[score]

  const Icon = cfg.icon

  return (
    <span className={cn(cfg.cls, size === 'sm' && 'text-[10px] px-1.5 py-0.5')}>
      <Icon size={size === 'sm' ? 10 : 12} />
      {cfg.label}
    </span>
  )
}
