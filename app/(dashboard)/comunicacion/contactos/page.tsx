'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Phone, Mail, Trash2, X, Loader2, Users } from 'lucide-react'
import { alertDialog, confirmDialog } from '@/lib/dialogs'
import { composeEmail } from '@/lib/mail-compose'

type Contacto = { id: string; nombre: string | null; email: string; empresa: string | null; telefono: string | null; origen: string }

export default function ComunicacionContactosPage() {
  const [list, setList] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', empresa: '', telefono: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/comunicacion/contactos')
    if (r.ok) setList(await r.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.email.trim()) { await alertDialog('Ingresa el email del contacto'); return }
    setSaving(true)
    const r = await fetch('/api/comunicacion/contactos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (r.ok) { setModal(false); setForm({ nombre: '', email: '', empresa: '', telefono: '' }); load() }
    else { const d = await r.json().catch(() => ({})); await alertDialog(d.error || 'No se pudo guardar') }
  }

  async function remove(c: Contacto) {
    if (!await confirmDialog(`¿Eliminar a ${c.nombre || c.email}?`, { danger: true, confirmLabel: 'Eliminar' })) return
    setList(l => l.filter(x => x.id !== c.id))
    await fetch(`/api/comunicacion/contactos?id=${c.id}`, { method: 'DELETE' })
  }

  const filtered = list.filter(c =>
    (c.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.empresa || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Contactos de Comunicación</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Directorio de contactos de correo · se completa solo al recibir correos</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={15} /> <span className="hidden sm:inline">Nuevo contacto</span>
        </button>
      </div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contacto..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Users size={34} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">{list.length === 0 ? 'Aún no hay contactos. Se agregan solos al sincronizar el correo, o crea uno manualmente.' : 'Sin resultados'}</p>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="flex items-center gap-3 sm:gap-4 p-4 hover:bg-gray-50 transition group">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-brand">{(c.nombre || c.email).slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{c.nombre || c.email}</p>
              <p className="text-xs text-gray-400 truncate">{c.empresa || (c.origen === 'correo' ? 'Desde correo' : 'Contacto')}</p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
              <button onClick={() => composeEmail({ to: c.email, subject: c.nombre || '' })} title="Enviar correo desde el CRM" className="flex items-center gap-1 hover:text-brand"><Mail size={11} />{c.email}</button>
              {c.telefono && <span className="flex items-center gap-1"><Phone size={11} />{c.telefono}</span>}
            </div>
            <button onClick={() => remove(c)} title="Eliminar" className="p-2 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Nuevo contacto</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" /></div>
              <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Email *</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="cliente@correo.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Empresa</label>
                  <input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" /></div>
                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" /></div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
