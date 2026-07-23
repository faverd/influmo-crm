'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Kanban, Settings, Shield, LogOut,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Menu, X,
  Bot, Contact, DollarSign, FileText, Receipt, TrendingDown,
  Package, Boxes, Truck, MessageSquare, FileStack, Map,
  HardHat, CheckSquare, Inbox, MessagesSquare, StickyNote, LayoutGrid,
  CalendarDays, MapPinned, ClipboardList, MessageCircle, BarChart3,
  Users, Settings2, LayoutPanelTop, ArrowLeftRight, Warehouse,
  MapPin, PieChart, Store,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getBranding } from '@/lib/branding-cache'
import { useState, useEffect, Suspense } from 'react'

type NavItem = { href: string; icon: React.ElementType; label: string }
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] }
type NavEntry = NavItem | NavGroup

function isGroup(e: NavEntry): e is NavGroup { return 'items' in e }

// Only the single best (longest) matching base should ever be active, so a
// parent route like /geo doesn't stay highlighted alongside /geo/ubicaciones.
function isActivePath(pathname: string, search: string, href: string, best: string) {
  const [base, query] = href.split('?')
  if (base !== best) return false
  if (!query) return true
  const hrefParams = new URLSearchParams(query)
  const curParams = new URLSearchParams(search)
  for (const [k, v] of hrefParams) {
    if ((curParams.get(k) ?? (k === 'tab' ? 'chat' : '')) !== v) return false
  }
  return true
}

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
  {
    label: 'Kanban', icon: Kanban,
    items: [
      { href: '/kanban',       icon: LayoutGrid,  label: 'Tablero' },
      { href: '/kanban/notas', icon: StickyNote,  label: 'Crear notas' },
    ],
  },
  {
    label: 'Calendario', icon: Calendar,
    items: [
      { href: '/calendar',        icon: CalendarDays,   label: 'Vista mensual' },
      { href: '/calendar/zonas',  icon: MapPinned,      label: 'Eventos por zona' },
      { href: '/calendar/tareas', icon: ClipboardList,  label: 'Tareas de campo' },
    ],
  },
  {
    label: 'Consultor BOT IA', icon: Bot,
    items: [
      { href: '/bot-ia?tab=chat',       icon: MessageCircle, label: 'Chat' },
      { href: '/bot-ia?tab=bots',       icon: Bot,           label: 'Bots' },
      { href: '/bot-ia?tab=docs',       icon: FileText,      label: 'Documentos' },
      { href: '/bot-ia?tab=calendario', icon: CalendarDays,  label: 'Calendario' },
      { href: '/bot-ia?tab=stats',      icon: BarChart3,     label: 'Estadísticas' },
      { href: '/bot-ia?tab=usuarios',   icon: Users,         label: 'Usuarios' },
      { href: '/bot-ia?tab=ajustes',    icon: Settings2,     label: 'Ajustes' },
    ],
  },
  {
    label: 'Almacén', icon: Package,
    items: [
      { href: '/almacen',              icon: LayoutPanelTop, label: 'Dashboard' },
      { href: '/almacen/inventario',   icon: Boxes,          label: 'Productos' },
      { href: '/almacen/movimientos',  icon: ArrowLeftRight, label: 'Entradas / Salidas' },
      { href: '/almacen/ubicaciones',  icon: Warehouse,      label: 'Ubicaciones' },
      { href: '/almacen/proveedores',  icon: Truck,          label: 'Proveedores' },
    ],
  },
  { href: '/whatsapp',     icon: MessageSquare, label: 'WhatsApp' },
  {
    label: 'Aplicaciones', icon: FileStack,
    items: [
      { href: '/aplicaciones/plantillas', icon: FileText, label: 'Plantillas' },
    ],
  },
  {
    label: 'Geolocalización', icon: Map,
    items: [
      { href: '/geo',              icon: MapPin,   label: 'Mapa Comercial' },
      { href: '/geo/analitica',    icon: PieChart, label: 'Analítica Geográfica' },
      { href: '/geo/ubicaciones',  icon: Store,    label: 'Ubicaciones' },
    ],
  },
  {
    label: 'Proyectos', icon: HardHat,
    items: [
      { href: '/proyectos',            icon: CheckSquare,    label: 'Mis Proyectos' },
    ],
  },
  {
    label: 'Comunicación', icon: MessagesSquare,
    items: [
      { href: '/comunicacion/bandeja',       icon: Inbox,          label: 'Bandeja de entrada' },
      { href: '/comunicacion/contactos',     icon: Contact,        label: 'Contactos' },
      { href: '/comunicacion/archivos',      icon: FileStack,      label: 'Archivos' },
      { href: '/comunicacion/configuracion', icon: Settings,       label: 'Configuración' },
    ],
  },
]

const BOTTOM_NAV: NavItem[] = [
  { href: '/settings', icon: Settings, label: 'Configuración' },
  { href: '/admin',    icon: Shield,   label: 'Administración' },
]

// All nav bases (path without query), used to pick the single best (longest) match.
const ALL_BASES = [
  ...NAV.flatMap(e => isGroup(e) ? e.items.map(i => i.href.split('?')[0]) : [e.href.split('?')[0]]),
  ...BOTTOM_NAV.map(i => i.href.split('?')[0]),
]
function bestBase(pathname: string): string {
  let best = ''
  for (const b of ALL_BASES) {
    if ((pathname === b || pathname.startsWith(b + '/')) && b.length > best.length) best = b
  }
  return best
}

function SidebarInner() {
  const pathname = usePathname()
  const router = useRouter()
  const search = useSearchParams().toString()
  const best = bestBase(pathname)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [navLogo, setNavLogo] = useState('')
  const [appName, setAppName] = useState('')
  const [appTagline, setAppTagline] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    // auto-open group containing current path
    return new Set<string>()
  })

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
    getBranding().then(b => {
      if (b.brand_nav_logo) setNavLogo(b.brand_nav_logo)
      if (b.brand_app_name) setAppName(b.brand_app_name)
      if (b.brand_app_tagline) setAppTagline(b.brand_app_tagline)
    })
    // open group that contains active route
    const b = bestBase(pathname)
    const active = new Set<string>()
    for (const entry of NAV) {
      if (isGroup(entry) && entry.items.some(i => isActivePath(pathname, search, i.href, b))) {
        active.add(entry.label)
      }
    }
    setOpenGroups(active)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close the mobile drawer whenever the route changes (link tapped)
  useEffect(() => { setMobileOpen(false) }, [pathname])

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
    <>
      {/* Mobile hamburger trigger — floats over content, stays put even when the drawer is closed.
          Must out-rank TopBar's own z-50 stacking context or its solid bg-white paints over this. */}
      <button
        onClick={() => setMobileOpen(true)}
        className={cn(
          'md:hidden fixed top-2.5 left-2.5 z-[60] w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm transition-opacity',
          mobileOpen && 'opacity-0 pointer-events-none'
        )}
      >
        <Menu size={17} className="text-gray-600" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-[55]" />
      )}

      <aside className={cn(
        'bg-white border-r border-gray-100 flex flex-col shrink-0 transition-all duration-200',
        'fixed inset-y-0 left-0 z-[60] w-[240px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:inset-auto md:translate-x-0 md:h-full',
        collapsed ? 'md:w-[72px]' : 'md:w-[220px]'
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute right-3 top-3 z-10 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={16} />
        </button>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden md:flex absolute -right-3 top-14 z-10 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-3 pt-3 pb-2.5 border-b border-gray-100', collapsed && 'justify-center px-2')}>
        {navLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={navLogo} alt="Logo" className={cn('object-contain object-left shrink-0', collapsed ? 'w-8 h-8' : 'h-11 max-w-[170px]')} />
        ) : (
          <>
            <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white font-bold text-xs">{(appName || process.env.NEXT_PUBLIC_APP_NAME || 'In').slice(0, 2).toUpperCase()}</span>
            </div>
            {!collapsed && (
              <div>
                <p className="font-bold text-gray-900 text-sm leading-tight">{appName || process.env.NEXT_PUBLIC_APP_NAME || 'Sistema'}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{appTagline || 'Decoración de Interiores'}</p>
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
              : isActivePath(pathname, search, entry.href, best)
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
          const groupActive = entry.items.some(i => isActivePath(pathname, search, i.href, best))

          if (collapsed) {
            // In collapsed mode, show group icon as first sub-link
            return entry.items.map(item => {
              const active = isActivePath(pathname, search, item.href, best)
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
                    const active = isActivePath(pathname, search, item.href, best)
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
          const active = isActivePath(pathname, search, href, best)
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
    </>
  )
}

export default function Sidebar() {
  return <Suspense><SidebarInner /></Suspense>
}
