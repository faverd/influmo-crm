'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  FlaskConical,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/conversations', icon: MessageSquare, label: 'Conversaciones' },
  { href: '/test-chat', icon: FlaskConical, label: 'Test Chat' },
  { href: '/settings', icon: Settings, label: 'Configuración' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-[72px] min-h-screen bg-white flex flex-col items-center py-5 gap-2 border-r border-gray-100 shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center mb-4">
        <span className="text-white font-bold text-sm">In</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                active
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
              )}
            >
              <Icon size={18} />
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Cerrar sesión"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <LogOut size={18} />
      </button>
    </aside>
  )
}
