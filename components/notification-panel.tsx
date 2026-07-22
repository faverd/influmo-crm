'use client'
import Link from 'next/link'
import { Bell, Mail, X, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NotifMensaje {
  id: string
  de_nombre: string | null
  de_email: string | null
  asunto: string | null
  cuerpo: string | null
  leido: boolean
  created_at: string
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

export default function NotificationPanel({
  mensajes, onClose, onMarkAllRead, onOpenMensaje,
}: {
  mensajes: NotifMensaje[]
  onClose: () => void
  onMarkAllRead: () => void
  onOpenMensaje: (id: string) => void
}) {
  const noLeidos = mensajes.filter(m => !m.leido).length

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-start sm:items-center justify-center p-3 sm:p-4 pt-14 sm:pt-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Bell size={15} className="text-brand" /> Notificaciones
            {noLeidos > 0 && <span className="text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-full">{noLeidos}</span>}
          </h3>
          <div className="flex items-center gap-1">
            {noLeidos > 0 && (
              <button onClick={onMarkAllRead} title="Marcar todo leído"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"><CheckCheck size={15} /></button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {mensajes.length === 0 ? (
            <div className="p-10 text-center">
              <Mail size={30} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">No hay notificaciones nuevas</p>
            </div>
          ) : mensajes.map(m => (
            <button key={m.id} onClick={() => onOpenMensaje(m.id)}
              className={cn('w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition', !m.leido && 'bg-blue-50/40')}>
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-brand">{(m.de_nombre || m.de_email || '??').slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-xs truncate', !m.leido ? 'font-semibold text-gray-900' : 'font-medium text-gray-600')}>{m.de_nombre || m.de_email}</p>
                  <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(m.created_at)}</span>
                </div>
                <p className={cn('text-xs truncate', !m.leido ? 'text-gray-800' : 'text-gray-500')}>{m.asunto}</p>
                <p className="text-[10px] text-gray-400 truncate">{m.cuerpo}</p>
              </div>
              {!m.leido && <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />}
            </button>
          ))}
        </div>

        <Link href="/comunicacion/bandeja" onClick={onClose}
          className="block text-center text-xs font-medium text-brand hover:underline px-4 py-3 border-t border-gray-100 bg-gray-50/60">
          Ver bandeja completa →
        </Link>
      </div>
    </div>
  )
}
