'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Kanban, Settings, Shield, LogOut,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Bot, Contact, DollarSign, FileText, Receipt, TrendingDown,
  Package, Boxes, Truck, MessageSquare, FileStack, Map,
  HardHat, CheckSquare, Inbox, MessagesSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getBranding } from '@/lib/branding-cache'
import { useState, useEffect } from 'react'

type NavItem = { href: string; icon: React.ElementType; label: string }
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] }
type NavEntry = NavItem | NavGroup

function isGroup(e: NavEntry): e is NavGroup { return 'items' in e }

const NAV: NavEntry[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/contactos',  icon: Contact,         label: 'Gestión Contactos' },
  {
    label: 'Finanzas', icon: DollarSign,
    items: [
      { href: '/finanzas/cotizaciones', icon: FileText,     label: 'Cotizaciones' },
      { href: '/finanzas/facturas',     icon: Receipt,      label: 'Facturas' },
      { href: '/finanzas/gastos',       icon: TrendingDown, label: 'Gastos' },
    ],
  },
  { href: '/kanban',   icon: Kanban,   label: 'Kanban' },
  { href: '/calendar', icon: Calendar, label: 'Calendario' },
  { href: '/bot-ia',   icon: Bot,      label: 'Consultor BOT IA' },
  {
    label: 'Almacén', icon: Package,
    items: [
      { href: '/almacen/inventario',  icon: Boxes,  label: 'Inventario' },
      { href: '/almacen/proveedores', icon: Truck,  label: 'Proveedores' },
    ],
  },
  { href: '/whatsapp',     icon: MessageSquare, label: 'WhatsApp' },
  {
    label: 'Aplicaciones', icon: FileStack,
    items: [
      { href: '/aplicaciones/plantillas', icon: FileText, label: 'Plantillas' },
    ],
  },
  { href: '/geo',       icon: Map,           label: 'Geolocalización' },
  {
    label: 'Proyectos', icon: HardHat,
    items: [
      { href: '/proyectos',            icon: CheckSquare,    label: 'Mis Proyectos' },
    ],
  },
  {
    label: 'Comunicación', icon: MessagesSquare,
    items: [
      { href: '/comunicacion/bandeja', icon: Inbox, label: 'Bandeja' },
    ],
  },
]

const BOTTOM_NAV: NavItem[] = [
  { href: '/settings', icon: Settings, label: 'Configuración' },
  { href: '/admin',    icon: Shield,   label: 'Administración' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [email, setEmail] = useState('')
  const [navLogo, setNavLogo] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    // auto-open group containing current path
    return new Set<string>()
  })

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
    getBranding().then(b => { if (b.brand_nav_logo) setNavLogo(b.brand_nav_logo) })
    // open group that contains active route
    const active = new Set<string>()
    for (const entry of NAV) {
      if (isGroup(entry) && entry.items.some(i => pathname.startsWith(i.href))) {
        active.add(entry.label)
      }
    }
    setOpenGroups(active)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleGroup(label: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : 'IN'

  const linkClass = (active: boolean, extra = '') => cn(
    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
    active ? 'bg-brand text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
    collapsed && 'justify-center px-0 w-10 mx-auto',
    extra
  )

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
        {navLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={navLogo} alt="Logo" className={cn('object-contain shrink-0', collapsed ? 'w-8 h-8' : 'h-9 max-w-[150px]')} />
        ) : (
          <>
            <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white font-bold text-xs">{(process.env.NEXT_PUBLIC_APP_NAME ?? 'In').slice(0, 2).toUpperCase()}</span>
            </div>
            {!collapsed && (
              <div>
                <p className="font-bold text-gray-900 text-sm leading-tight">{process.env.NEXT_PUBLIC_APP_NAME ?? 'Sistema'}</p>
                <p className="text-[10px] text-gray-400 leading-tight">Decoración de Interiores</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1 mt-1 overflow-y-auto">
        {NAV.map(entry => {
          if (!isGroup(entry)) {
            const active = entry.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(entry.href)
            return (
              <Link key={entry.href} href={entry.href} title={collapsed ? entry.label : undefined}
                className={linkClass(active)}>
                <entry.icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate">{entry.label}</span>}
              </Link>
            )
          }

          // Group
          const isOpen = openGroups.has(entry.label)
          const groupActive = entry.items.some(i => pathname.startsWith(i.href))

          if (collapsed) {
            // In collapsed mode, show group icon as first sub-link
            return entry.items.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} title={item.label}
                  className={linkClass(active)}>
                  <item.icon size={16} className="shrink-0" />
                </Link>
              )
            })
          }

          return (
            <div key={entry.label}>
              <button
                onClick={() => toggleGroup(entry.label)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                  groupActive ? 'text-brand' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                )}
              >
                <entry.icon size={16} className="shrink-0" />
                <span className="flex-1 text-left truncate">{entry.label}</span>
                {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {isOpen && (
                <div className="ml-4 flex flex-col gap-0.5 mt-0.5">
                  {entry.items.map(item => {
                    const active = pathname.startsWith(item.href)
                    return (
                      <Link key={item.href} href={item.href}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                          active ? 'bg-brand text-white' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                        )}>
                        <item.icon size={13} className="shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom nav + user */}
      <div className="flex flex-col gap-0.5 p-2 border-t border-gray-100">
        {BOTTOM_NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} title={collapsed ? label : undefined}
              className={linkClass(active)}>
              <Icon size={16} className="shrink-0" />
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
              <button onClick={handleLogout}
                className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors mt-0.5">
                <LogOut size={10} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
