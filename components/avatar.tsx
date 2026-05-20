import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'

const COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function colorFor(str: string) {
  let hash = 0
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface Props {
  name: string | null
  phone: string
  size?: number
}

export default function Avatar({ name, phone, size = 36 }: Props) {
  const initials = getInitials(name, phone)
  const color = colorFor(phone)
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold shrink-0', color)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}
