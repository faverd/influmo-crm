'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Shield, Mail, RefreshCw, CheckCircle, XCircle, UserCog, Leaf, Tractor, Building2 } from 'lucide-react'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  role: string
}

interface UserRole {
  id: string
  email: string
  role: 'administrador' | 'agronomo' | 'agricultor' | 'empresa'
  full_name: string
  created_at: string
}

const ROLE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  administrador: { label: 'Administrador', icon: Shield,    color: 'bg-purple-100 text-purple-700' },
  agronomo:      { label: 'Ing. Agrónomo', icon: Leaf,      color: 'bg-green-100 text-green-700' },
  agricultor:    { label: 'Agricultor',    icon: Tractor,   color: 'bg-amber-100 text-amber-700' },
  empresa:       { label: 'Empresa Agro',  icon: Building2, color: 'bg-blue-100 text-blue-700' },
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => { setUsers(data.users ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  // ── Roles ──
  const [roles, setRoles] = useState<UserRole[]>([])
  const [roleForm, setRoleForm] = useState({ email: '', full_name: '', role: 'agricultor' })
  const [savingRole, setSavingRole] = useState(false)

  const loadRoles = useCallback(() => {
    fetch('/api/admin/roles').then(r => r.json()).then(d => { if (Array.isArray(d)) setRoles(d) }).catch(() => {})
  }, [])

  async function saveRole(e: React.FormEvent) {
    e.preventDefault()
    if (!roleForm.email) return
    setSavingRole(true)
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      })
      if (res.ok) { setRoleForm({ email: '', full_name: '', role: 'agricultor' }); loadRoles() }
    } finally { setSavingRole(false) }
  }

  async function deleteRole(id: string) {
    if (!confirm('¿Eliminar este rol asignado?')) return
    await fetch('/api/admin/roles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadRoles()
  }

  useEffect(() => { load(); loadRoles() }, [loadRoles])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail) return
    setInviting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'ok', text: `Magic link enviado a ${inviteEmail}` })
        setInviteEmail('')
        load()
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Error al invitar usuario' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' })
    }
    setInviting(false)
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`¿Eliminar usuario ${email}?`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMessage({ type: 'ok', text: `Usuario ${email} eliminado` })
      load()
    } else {
      setMessage({ type: 'error', text: 'No se pudo eliminar el usuario' })
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return 'Nunca'
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={22} className="text-gray-700" />
            Administración
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de usuarios del CRM</p>
        </div>
        <button onClick={load} className="btn-ghost text-sm" title="Recargar">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Invite user */}
      <div className="card mb-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Plus size={16} className="text-brand" />
          Invitar nuevo usuario
        </h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <div className="relative flex-1">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="input pl-9"
              required
            />
          </div>
          <button type="submit" disabled={inviting} className="btn-primary">
            {inviting ? 'Enviando...' : 'Enviar acceso'}
          </button>
        </form>

        {message && (
          <div className={`flex items-center gap-2 mt-3 text-sm px-3 py-2 rounded-lg ${
            message.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'ok'
              ? <CheckCircle size={14} />
              : <XCircle size={14} />}
            {message.text}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          El usuario recibirá un magic link por email para acceder al CRM.
        </p>
      </div>

      {/* Users list */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">
          Usuarios activos
          {!loading && <span className="ml-2 text-xs font-normal text-gray-400">({users.length})</span>}
        </h2>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay usuarios registrados</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-light border border-brand/20 flex items-center justify-center">
                    <span className="text-brand text-xs font-bold">
                      {user.email.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>Creado: {formatDate(user.created_at)}</span>
                      <span>Último acceso: {formatDate(user.last_sign_in_at)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(user.id, user.email)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Eliminar usuario"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roles & permissions */}
      <div className="card mt-5">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <UserCog size={16} className="text-brand" /> Roles y permisos
        </h2>
        <p className="text-xs text-gray-400 mb-4">Asigna un rol a cada usuario del sistema</p>

        <form onSubmit={saveRole} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 mb-4">
          <input type="email" value={roleForm.email} onChange={e => setRoleForm(f => ({ ...f, email: e.target.value }))}
            placeholder="email@empresa.com" required
            className="input text-sm" />
          <input value={roleForm.full_name} onChange={e => setRoleForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="Nombre completo (opcional)"
            className="input text-sm" />
          <select value={roleForm.role} onChange={e => setRoleForm(f => ({ ...f, role: e.target.value }))}
            className="input text-sm bg-white">
            {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button type="submit" disabled={savingRole} className="btn-primary text-sm whitespace-nowrap">
            {savingRole ? '...' : 'Asignar'}
          </button>
        </form>

        {roles.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No hay roles asignados aún</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {roles.map(r => {
              const meta = ROLE_META[r.role] ?? ROLE_META.agricultor
              const RoleIcon = meta.icon
              return (
                <div key={r.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <RoleIcon size={16} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.full_name || r.email}</p>
                      <p className="text-xs text-gray-400">{r.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${meta.color}`}>
                      <RoleIcon size={11} /> {meta.label}
                    </span>
                    <button onClick={() => deleteRole(r.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
