'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Trash2, Shield, Mail, RefreshCw, CheckCircle, XCircle,
  UserCog, Palette, Sofa, Building2, MapPin, Check,
} from 'lucide-react'
import { confirmDialog } from '@/lib/dialogs'

interface User { id: string; email: string; created_at: string; last_sign_in_at: string | null }
interface UserRole { id: string; email: string; role: string; full_name: string; created_at: string }

const ROLE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  administrador: { label: 'Administrador',         icon: Shield,    color: 'bg-purple-100 text-purple-700' },
  disenador:     { label: 'Diseñador Interiores',  icon: Palette,   color: 'bg-blue-100 text-blue-700' },
  decorador:     { label: 'Decorador',             icon: Sofa,      color: 'bg-green-100 text-green-700' },
  empresa:       { label: 'Empresa Deco',          icon: Building2, color: 'bg-amber-100 text-amber-700' },
}

const MODULES_DECO = [
  'Dashboard','Gestión Contactos','Finanzas','Kanban','Calendario',
  'Consultor BOT IA','Almacén','Proyectos','Comunicación','WhatsApp',
  'Aplicaciones','Geolocalización','Configuración','Administración',
]

const UBICACIONES_DEMO = [
  { ciudad: 'Lima · Lima',            lugar: 'Villa El Salvador, Lima, Perú', fecha: '19 jul. 2026, 09:34 p. m.', lat: '-12.2036', lon: '-76.9669', actual: true },
  { ciudad: 'Lima · Lima',            lugar: 'Lima, Perú',                    fecha: '19 jul. 2026, 07:21 p. m.', lat: '-12.0484', lon: '-77.0428', actual: false },
  { ciudad: 'Lima · Lima',            lugar: 'Lima, Perú',                    fecha: '19 jul. 2026, 07:01 p. m.', lat: '-12.0484', lon: '-77.0428', actual: false },
  { ciudad: 'Lima · Lima',            lugar: 'Villa El Salvador, Lima, Perú', fecha: '19 jul. 2026, 06:38 p. m.', lat: '-12.2036', lon: '-76.9669', actual: false },
  { ciudad: 'Mi ubicación',           lugar: '',                              fecha: '01 jul. 2026, 08:46 p. m.', lat: '-13.4209', lon: '-76.1265', actual: false },
]

// Default permissions: all roles see all modules except Configuración and Administración (only admins)
function defaultPerms() {
  const perms: Record<string, Record<string, boolean>> = {}
  for (const role of Object.keys(ROLE_META)) {
    perms[role] = {}
    for (const mod of MODULES_DECO) {
      perms[role][mod] = role === 'administrador' ? true : !['Configuración','Administración'].includes(mod)
    }
  }
  return perms
}

export default function AdminPage() {
  const [tab, setTab] = useState<'general'|'permisos'>('general')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok'|'error'; text: string } | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [roleForm, setRoleForm] = useState({ email: '', full_name: '', role: 'decorador' })
  const [savingRole, setSavingRole] = useState(false)
  const [perms, setPerms] = useState(defaultPerms())
  const [savedPerms, setSavedPerms] = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/admin/users').then(r => r.json()).then(d => { setUsers(d.users ?? []); setLoading(false) }).catch(() => setLoading(false))
  }
  const loadRoles = useCallback(() => {
    fetch('/api/admin/roles').then(r => r.json()).then(d => { if (Array.isArray(d)) setRoles(d) }).catch(() => {})
  }, [])

  useEffect(() => { load(); loadRoles() }, [loadRoles])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault(); if (!inviteEmail) return
    setInviting(true); setMessage(null)
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) })
      const data = await res.json()
      if (res.ok) { setMessage({ type: 'ok', text: `Magic link enviado a ${inviteEmail}` }); setInviteEmail(''); load() }
      else setMessage({ type: 'error', text: data.error ?? 'Error al invitar usuario' })
    } catch { setMessage({ type: 'error', text: 'Error de conexión' }) }
    setInviting(false)
  }

  async function handleDelete(id: string, email: string) {
    if (!await confirmDialog(`¿Eliminar usuario ${email}?`, { danger: true, confirmLabel: 'Eliminar' })) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) { setMessage({ type: 'ok', text: `Usuario ${email} eliminado` }); load() }
    else setMessage({ type: 'error', text: 'No se pudo eliminar el usuario' })
  }

  async function saveRole(e: React.FormEvent) {
    e.preventDefault(); if (!roleForm.email) return
    setSavingRole(true)
    try {
      const res = await fetch('/api/admin/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roleForm) })
      if (res.ok) { setRoleForm({ email: '', full_name: '', role: 'decorador' }); loadRoles() }
    } finally { setSavingRole(false) }
  }

  async function deleteRole(id: string) {
    if (!await confirmDialog('¿Eliminar este rol asignado?', { danger: true, confirmLabel: 'Eliminar' })) return
    await fetch('/api/admin/roles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadRoles()
  }

  function togglePerm(role: string, mod: string) {
    setPerms(p => ({ ...p, [role]: { ...p[role], [mod]: !p[role][mod] } }))
  }

  function formatDate(iso: string | null) {
    if (!iso) return 'Nunca'
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate">
            <Shield size={20} className="text-gray-700 shrink-0" /> Administración
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Gestión de usuarios del CRM</p>
        </div>
        <button onClick={load} title="Actualizar" className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition shrink-0">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-100 pb-0">
        {[
          { key: 'general',   label: '☰ General' },
          { key: 'permisos',  label: '👤 Usuarios y Permisos' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t.key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="space-y-5">
          {/* Invite */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Plus size={15} className="text-brand" /> Invitar nuevo usuario
            </h2>
            <form onSubmit={handleInvite} className="flex gap-3">
              <div className="relative flex-1">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  className="w-full pl-9 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
              <button type="submit" disabled={inviting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-60">
                {inviting ? 'Enviando...' : 'Enviar acceso'}
              </button>
            </form>
            {message && (
              <div className={`flex items-center gap-2 mt-3 text-sm px-3 py-2 rounded-lg ${message.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.type === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {message.text}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">El usuario recibirá un magic link por email para acceder al CRM.</p>
          </div>

          {/* Active users */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">
              Usuarios activos {!loading && <span className="ml-1 text-xs font-normal text-gray-400">({users.length})</span>}
            </h2>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
            ) : users.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No hay usuarios registrados</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
                        <span className="text-brand text-xs font-bold">{user.email.slice(0,2).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>Creado: {formatDate(user.created_at)}</span>
                          <span>Último acceso: {formatDate(user.last_sign_in_at)}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(user.id, user.email)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Roles */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <UserCog size={15} className="text-brand" /> Roles y permisos
            </h2>
            <p className="text-xs text-gray-400 mb-4">Asigna un rol a cada usuario del sistema</p>
            <form onSubmit={saveRole} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 mb-4">
              <input type="email" value={roleForm.email} onChange={e => setRoleForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@empresa.com" required
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              <input value={roleForm.full_name} onChange={e => setRoleForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Nombre completo (opcional)"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              <select value={roleForm.role} onChange={e => setRoleForm(f => ({ ...f, role: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
                {Object.entries(ROLE_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button type="submit" disabled={savingRole}
                className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-60">
                {savingRole ? '...' : 'Asignar'}
              </button>
            </form>
            {roles.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No hay roles asignados aún</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {roles.map(r => {
                  const meta = ROLE_META[r.role] ?? ROLE_META.decorador
                  const RoleIcon = meta.icon
                  return (
                    <div key={r.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                          <RoleIcon size={15} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.full_name || r.email}</p>
                          <p className="text-xs text-gray-400">{r.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${meta.color}`}>
                          <RoleIcon size={10} /> {meta.label}
                        </span>
                        <button onClick={() => deleteRole(r.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Location history */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <MapPin size={15} className="text-brand" /> Historial de ubicaciones
            </h2>
            <p className="text-xs text-gray-400 mb-4">Últimas 5 ubicaciones desde donde se abrió el sistema (GPS), con fecha y hora</p>
            <div className="space-y-3">
              {UBICACIONES_DEMO.map((u, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${u.actual ? 'bg-brand' : 'bg-gray-100'}`}>
                    <MapPin size={14} className={u.actual ? 'text-white' : 'text-gray-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      {u.ciudad}
                      {u.actual && <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Actual</span>}
                    </p>
                    {u.lugar && <p className="text-xs text-gray-500">{u.lugar}</p>}
                    <p className="text-xs text-gray-400">{u.fecha} · +{u.lat}, {u.lon}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'permisos' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Shield size={15} className="text-brand" /> Permisos por módulo
            </h2>
            <p className="text-xs text-gray-400 mb-5">Marca los módulos que cada rol puede ver. Si un rol no tiene ninguno marcado, verá <strong>todos</strong>. El Administrador siempre ve todo.</p>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide w-48">Módulo</th>
                    {Object.entries(ROLE_META).map(([key, meta]) => (
                      <th key={key} className="text-center py-2 px-2 text-xs font-semibold text-gray-700">
                        <div className="flex flex-col items-center gap-1">
                          <meta.icon size={14} className="text-gray-400" />
                          {meta.label.split(' ')[0]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MODULES_DECO.map(mod => (
                    <tr key={mod} className="hover:bg-gray-50/50 transition">
                      <td className="py-2.5 pr-4 text-sm text-gray-700 font-medium">{mod}</td>
                      {Object.keys(ROLE_META).map(role => (
                        <td key={role} className="py-2.5 px-2 text-center">
                          {role === 'administrador' ? (
                            <div className="w-5 h-5 rounded-md bg-brand mx-auto flex items-center justify-center">
                              <Check size={11} className="text-white" />
                            </div>
                          ) : (
                            <button onClick={() => togglePerm(role, mod)}
                              className={`w-5 h-5 rounded-md border-2 mx-auto flex items-center justify-center transition ${
                                perms[role]?.[mod]
                                  ? 'bg-brand border-brand'
                                  : 'border-gray-300 hover:border-brand/50'
                              }`}>
                              {perms[role]?.[mod] && <Check size={11} className="text-white" />}
                            </button>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <button onClick={() => { setSavedPerms(true); setTimeout(() => setSavedPerms(false), 2500) }}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:opacity-90 transition">
                {savedPerms ? <><Check size={14} /> ¡Guardado!</> : 'Guardar permisos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
