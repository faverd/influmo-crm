'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, Calendar, Kanban,
  Settings, FlaskConical, Shield, LogOut, ChevronLeft, ChevronRight, Megaphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/conversations', icon: MessageSquare,   label: 'Conversaciones' },
  { href: '/kanban',        icon: Kanban,          label: 'Kanban' },
  { href: '/calendar',      icon: Calendar,        label: 'Calendario' },
  { href: '/broadcasts',    icon: Megaphone,       label: 'Difusión' },
  { href: '/test-chat',     icon: FlaskConical,    label: 'Test Chat' },
]

const BOTTOM_NAV = [
  { href: '/settings', icon: Settings, label: 'Configuración' },
  { href: '/admin',    icon: Shield,   label: 'Administración' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : 'IN'

  return (
    <aside className={cn(
      'relative min-h-screen bg-white border-r border-gray-100 flex flex-col transition-all duration-200 shrink-0',
      collapsed ? 'w-[72px]' : 'w-[220px]'
    )}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-14 z-10 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 py-5 border-b border-gray-100', collapsed && 'justify-center px-2')}>
        <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white font-bold text-xs">In</span>
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Influmo</p>
            <p className="text-[10px] text-gray-400 leading-tight">WhatsApp CRM</p>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1 mt-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                active ? 'bg-brand text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                collapsed && 'justify-center px-0 w-10 mx-auto'
              )}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav + user */}
      <div className="flex flex-col gap-0.5 p-2 border-t border-gray-100">
        {BOTTOM_NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                collapsed && 'justify-center px-0 w-10 mx-auto'
              )}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}

        <div className={cn('flex items-center gap-2.5 mt-2 px-2 py-1.5', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-brand-light border border-brand/20 flex items-center justify-center shrink-0">
            <span className="text-brand text-xs font-bold">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{email || 'Usuario'}</p>
              <button
                onClick={handleLogout}
                className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors mt-0.5"
              >
                <LogOut size={10} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
