'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Shield, Mail, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  role: string
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

  useEffect(() => { load() }, [])

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
    </div>
  )
}
