'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Plus, Download, RefreshCw, Mail, Phone, X, Loader2,
  FileText, Star, Trash2, Paperclip, Check, ChevronDown, MessageSquare, Eye, Pencil, Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { alertDialog, confirmDialog } from '@/lib/dialogs'
import { composeEmail } from '@/lib/mail-compose'

interface Attachment { url: string; name: string; type: string }
interface Contact {
  id: string; name: string; email: string; phone: string; contact_hours: string
  status: string; assigned_to: string; source: string; rating: number
  note: string; attachments: Attachment[]
  first_contact: string; last_interaction: string; created_at: string
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  nuevo:       { label: 'NUEVO',        color: 'border-l-blue-400 text-blue-600' },
  en_progreso: { label: 'EN PROGRESO',  color: 'border-l-amber-400 text-amber-600' },
  con_venta:   { label: 'CON VENTA',    color: 'border-l-green-500 text-green-600' },
  sin_venta:   { label: 'SIN VENTA',    color: 'border-l-red-400 text-red-600' },
  esperando:   { label: 'ESPERANDO',    color: 'border-l-purple-400 text-purple-600' },
}

const TABS = [
  { id: 'total', label: 'Total' },
  { id: 'nuevo', label: 'Nuevo' },
  { id: 'en_progreso', label: 'En progreso' },
  { id: 'con_venta', label: 'Con venta' },
  { id: 'sin_venta', label: 'Sin venta' },
]

const ASSIGNEES = ['Administrador', 'Fernando Muro Blas', 'Katiuska Mendez', 'Gudy Milla', 'Abigail Juárez']

function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' - ' +
    d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [tab, setTab] = useState('total')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [viewing, setViewing] = useState<Contact | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback((status: string, q: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'total') params.set('status', status)
    if (q) params.set('q', q)
    fetch(`/api/contactos?${params}`).then(r => r.json())
      .then(d => { setContacts(d.contacts ?? []); setCounts(d.counts ?? {}) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(tab, search) }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(tab, search), 350)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  async function changeField(id: string, field: string, value: string) {
    setContacts(cs => cs.map(c => c.id === id ? { ...c, [field]: value } : c))
    await fetch('/api/contactos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, [field]: value }) })
    load(tab, search)
  }

  async function remove(c: Contact) {
    if (!await confirmDialog(`¿Eliminar el contacto ${c.name}?`, { danger: true, confirmLabel: 'Eliminar' })) return
    setContacts(cs => cs.filter(x => x.id !== c.id))
    const r = await fetch('/api/contactos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id }) })
    if (!r.ok) { await alertDialog('No se pudo eliminar el contacto'); load(tab, search) }
    else load(tab, search)
  }

  function exportCSV() {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Estado', 'Asignado a', 'Horario', 'Nota', 'Primer contacto', 'Última interacción']
    const rows = contacts.map(c => [c.name, c.email, c.phone, STATUS_META[c.status]?.label ?? c.status, c.assigned_to, c.contact_hours, (c.note || '').replace(/[\n;]/g, ' '), fmtDate(c.first_contact), fmtDate(c.last_interaction)])
    const csv = '﻿' + [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `contactos-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 pt-4">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === t.id ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t.label}
              <span className="text-xs text-gray-400">({(counts[t.id] ?? (t.id === 'total' ? counts.total : 0)) || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <button onClick={() => load(tab, search)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en contactos"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }} title="Nuevo Contacto"
          className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90">
          <Plus size={15} /> <span className="hidden sm:inline">Nuevo Contacto</span>
        </button>
        <button onClick={exportCSV} title="Exportar"
          className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          <Download size={15} /> <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>

      {/* Table */}
      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No hay contactos {search ? 'que coincidan' : 'en esta categoría'}</p>
            </div>
          ) : (
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr className="text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Datos</th>
                  <th className="px-4 py-3">Notas</th>
                  <th className="px-4 py-3">Primer contacto</th>
                  <th className="px-4 py-3">Última interacción</th>
                  <th className="px-4 py-3">Asignado a</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => {
                  const st = STATUS_META[c.status] ?? STATUS_META.nuevo
                  return (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
                      <td className="px-4 py-3">
                        <button onClick={() => { setEditing(c); setShowModal(true) }} className="text-left">
                          <p className="text-sm font-medium text-gray-800 underline-offset-2 hover:underline hover:text-brand">{c.name}</p>
                          <div className="flex gap-0.5 mt-0.5">
                            {[1,2,3,4,5].map(i => <Star key={i} size={11} className={i <= c.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />)}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {c.email && <button onClick={() => composeEmail({ to: c.email, subject: `Contacto — ${c.name}` })} title="Enviar correo desde el CRM" className="flex items-center gap-1.5 text-gray-600 hover:text-brand"><Mail size={12} className="text-gray-400" />{c.email}</button>}
                        {c.phone && <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-green-600 hover:underline mt-0.5"><Phone size={12} />{c.phone}</a>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-gray-400"><FileText size={13} /> ({c.attachments?.length ?? 0})</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c.first_contact)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c.last_interaction)}</td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <select value={c.assigned_to} onChange={e => changeField(c.id, 'assigned_to', e.target.value)}
                            className="appearance-none border border-gray-200 rounded-lg pl-2.5 pr-7 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white w-full min-w-[140px]">
                            {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
                          </select>
                          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn('relative border-l-4 rounded-lg', st.color.split(' ')[0])}>
                          <select value={c.status} onChange={e => changeField(c.id, 'status', e.target.value)}
                            className={cn('appearance-none bg-white border border-gray-200 rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/30 w-full min-w-[120px]', st.color.split(' ')[1])}>
                            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                          <button onClick={() => setViewing(c)} title="Ver" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-500 transition"><Eye size={15} /></button>
                          {c.phone && <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" title="Compartir por WhatsApp" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-green-600 transition"><Share2 size={15} /></a>}
                          <button onClick={() => { setEditing(c); setShowModal(true) }} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-amber-500 transition"><Pencil size={15} /></button>
                          <button onClick={() => remove(c)} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <ContactModal contact={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); load(tab, search) }} />
      )}
      {viewing && (
        <ContactView contact={viewing} onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); setShowModal(true) }} />
      )}
    </div>
  )
}

function ContactView({ contact: c, onClose, onEdit }: { contact: Contact; onClose: () => void; onEdit: () => void }) {
  const st = STATUS_META[c.status] ?? STATUS_META.nuevo
  const rows: [string, React.ReactNode][] = [
    ['Nombre', c.name], ['Email', c.email || '—'], ['Teléfono', c.phone || '—'],
    ['Estado', st.label], ['Asignado a', c.assigned_to || '—'], ['Horario', c.contact_hours || '—'],
    ['Calificación', '⭐'.repeat(c.rating || 0) || '—'], ['Nota', c.note || '—'],
    ['Primer contacto', fmtDate(c.first_contact)], ['Última interacción', fmtDate(c.last_interaction)],
    ['Adjuntos', String(c.attachments?.length ?? 0)],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-900">{c.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-3">
          <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
            <tbody>
              {rows.map(([k, v], i) => (
                <tr key={k} className={i % 2 ? 'bg-gray-50/60' : 'bg-white'}>
                  <td className="px-3 py-2 text-gray-500 font-medium border-r border-gray-100 w-1/3 align-top">{k}</td>
                  <td className="px-3 py-2 text-gray-800 break-words whitespace-pre-wrap">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          {c.phone && <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><Share2 size={14} /> WhatsApp</a>}
          {c.email && <button onClick={() => composeEmail({ to: c.email, subject: `Contacto — ${c.name}` })} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><Mail size={14} /> Correo</button>}
          <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90"><Pencil size={14} /> Editar</button>
        </div>
      </div>
    </div>
  )
}

// ── Contact modal ────────────────────────────────────────────────────────────

function ContactModal({ contact, onClose, onSaved }: { contact: Contact | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!contact
  const [form, setForm] = useState({
    name: contact?.name ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '',
    contact_hours: contact?.contact_hours ?? '', status: contact?.status ?? 'nuevo',
    assigned_to: contact?.assigned_to ?? 'Administrador', source: contact?.source ?? '',
    rating: contact?.rating ?? 0, note: contact?.note ?? '',
    first_contact: (contact?.first_contact ?? new Date().toISOString()).slice(0, 10),
  })
  const [attachments, setAttachments] = useState<Attachment[]>(contact?.attachments ?? [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/contactos/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok) setAttachments(a => [...a, { url: d.url, name: d.name, type: d.type }])
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  function insertEmoji(em: string) { set('note', form.note + em) }

  async function save() {
    if (!form.name.trim()) { setError('El nombre del contacto es obligatorio'); return }
    setSaving(true); setError('')
    try {
      const body = { ...form, attachments, first_contact: new Date(form.first_contact).toISOString(), ...(isEdit ? { id: contact!.id } : {}) }
      const res = await fetch('/api/contactos', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      onSaved()
    } catch (e) { setError(String(e)) }
    finally { setSaving(false) }
  }

  const EMOJIS = ['😀','👍','🌱','📞','📧','⭐','🔥','✅','💰','📅','🏠','🚚','⚠️','❤️','🎯','📦']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar contacto' : 'Agregar contacto'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className={cn('w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30', error && !form.name.trim() ? 'border-red-400' : 'border-gray-200')} />
              {error && !form.name.trim() && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Teléfono</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+51 999 999 999"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            <p className="text-xs text-gray-400 mt-1">Incluye el (+) con código de país para reconocerlo como WhatsApp. Ej. +51 999 999 999</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Horario de contacto</label>
              <input value={form.contact_hours} onChange={e => set('contact_hours', e.target.value)} placeholder="ej. 15 a 18"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Primer contacto</label>
              <input type="date" value={form.first_contact} onChange={e => set('first_contact', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white">
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Asignado a</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white">
                {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Calificación</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => set('rating', i === form.rating ? 0 : i)}>
                  <Star size={20} className={i <= form.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 hover:text-amber-200'} />
                </button>
              ))}
            </div>
          </div>

          {/* Note + emojis */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Nota</label>
            <div className="flex gap-1 flex-wrap mb-2">
              {EMOJIS.map(em => <button key={em} onClick={() => insertEmoji(em)} className="w-7 h-7 rounded hover:bg-gray-100 text-base">{em}</button>)}
            </div>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Archivos adjuntos (imagen, PDF)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg pl-2 pr-1 py-1">
                  {a.type?.startsWith('image/')
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.url} alt="" className="w-6 h-6 rounded object-cover" />
                    : <FileText size={14} className="text-red-400" />}
                  <a href={a.url} target="_blank" rel="noopener" className="text-xs text-gray-600 hover:text-brand max-w-[120px] truncate">{a.name}</a>
                  <button onClick={() => setAttachments(at => at.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><X size={12} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />} Adjuntar archivo
            </button>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.docx,.xlsx" className="hidden" onChange={uploadFile} />
          </div>

          {error && form.name.trim() && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand/90 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {isEdit ? 'Guardar cambios' : 'Agregar contacto'}
          </button>
        </div>
      </div>
    </div>
  )
}
