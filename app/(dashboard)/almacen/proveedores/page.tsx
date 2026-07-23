'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Phone, Mail, Globe, Star, Eye, Pencil, Trash2, Share2, X, Loader2, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { alertDialog, confirmDialog } from '@/lib/dialogs'

interface Proveedor {
  id: string; nombre: string; categoria: string; contacto: string | null
  telefono: string | null; email: string | null; web: string | null
  calificacion: number; notas: string | null
}
const CATEGORIAS = ['telas', 'cortinas', 'persianas', 'pintura', 'muebles', 'accesorios', 'iluminacion', 'pisos', 'otros']
const EMPTY = { nombre: '', categoria: 'telas', contacto: '', telefono: '', email: '', web: '', calificacion: 0, notas: '' }

export default function ProveedoresPage() {
  const [list, setList] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Proveedor> | null>(null)
  const [viewing, setViewing] = useState<Proveedor | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/proveedores').then(r => r.json()).then(d => { setList(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  async function save(p: Partial<Proveedor>) {
    const r = await fetch('/api/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
    if (!r.ok) { const d = await r.json().catch(() => ({})); await alertDialog(d.error || 'No se pudo guardar'); return }
    setEditing(null); load()
  }
  async function remove(p: Proveedor) {
    if (!await confirmDialog(`¿Eliminar el proveedor ${p.nombre}?`, { danger: true, confirmLabel: 'Eliminar' })) return
    setList(l => l.filter(x => x.id !== p.id))
    await fetch(`/api/proveedores?id=${p.id}`, { method: 'DELETE' })
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Directorio de proveedores de materiales</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> <span className="hidden sm:inline">Nuevo Proveedor</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : list.length === 0 ? (
        <div className="py-16 text-center"><Truck size={34} className="mx-auto text-gray-200 mb-2" /><p className="text-sm text-gray-400">Sin proveedores. Crea el primero.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{p.nombre}</h3>
                  <span className="text-xs text-gray-400 capitalize">{p.categoria}</span>
                </div>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < (p.calificacion || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {p.contacto && <p className="text-gray-600 font-medium">{p.contacto}</p>}
                {p.telefono && <p className="flex items-center gap-2 text-gray-500"><Phone size={13} />{p.telefono}</p>}
                {p.email && <p className="flex items-center gap-2 text-gray-500"><Mail size={13} />{p.email}</p>}
                {p.web && <a href={p.web.startsWith('http') ? p.web : `https://${p.web}`} target="_blank" rel="noopener" className="flex items-center gap-2 text-blue-500 hover:underline"><Globe size={13} />{p.web}</a>}
              </div>
              {p.notas && <p className="mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">{p.notas}</p>}
              <div className="flex items-center justify-end gap-0.5 mt-3 pt-3 border-t border-gray-50">
                <button onClick={() => setViewing(p)} title="Ver" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-500 transition"><Eye size={15} /></button>
                {p.telefono && <a href={`https://wa.me/${(p.telefono || '').replace(/\D/g, '')}`} target="_blank" rel="noopener" title="WhatsApp" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-green-600 transition"><Share2 size={15} /></a>}
                <button onClick={() => setEditing(p)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-amber-500 transition"><Pencil size={15} /></button>
                <button onClick={() => remove(p)} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ProveedorModal initial={editing} onClose={() => setEditing(null)} onSave={save} />}
      {viewing && <ProveedorView p={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null) }} />}
    </div>
  )
}

function ProveedorModal({ initial, onClose, onSave }: { initial: Partial<Proveedor>; onClose: () => void; onSave: (p: Partial<Proveedor>) => void }) {
  const [f, setF] = useState<Partial<Proveedor>>({ categoria: 'telas', calificacion: 0, ...initial })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Proveedor, v: unknown) => setF(p => ({ ...p, [k]: v }))
  const isEdit = !!f.id
  async function handle() {
    if (!f.nombre?.trim()) { await alertDialog('El nombre es obligatorio'); return }
    setSaving(true); await onSave(f); setSaving(false)
  }
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20'
  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold">{isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          {([
            { key: 'nombre', label: 'Nombre *', ph: 'Nombre del proveedor' },
            { key: 'contacto', label: 'Contacto', ph: 'Nombre de contacto' },
            { key: 'telefono', label: 'Teléfono', ph: '987654321' },
            { key: 'email', label: 'Email', ph: 'ventas@proveedor.com' },
            { key: 'web', label: 'Web', ph: 'www.proveedor.com' },
          ] as const).map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
              <input value={(f[key] as string) ?? ''} onChange={e => set(key, e.target.value)} placeholder={ph} className={inputCls} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Categoría</label>
            <select value={f.categoria} onChange={e => set('categoria', e.target.value)} className={inputCls}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Calificación</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} type="button" onClick={() => set('calificacion', i === f.calificacion ? 0 : i)}>
                  <Star size={20} className={i <= (f.calificacion || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 hover:text-yellow-200'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Notas</label>
            <textarea value={f.notas ?? ''} onChange={e => set('notas', e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
          <button onClick={handle} disabled={saving} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} {isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProveedorView({ p, onClose, onEdit }: { p: Proveedor; onClose: () => void; onEdit: () => void }) {
  const rows: [string, React.ReactNode][] = [
    ['Nombre', p.nombre], ['Categoría', p.categoria], ['Contacto', p.contacto || '—'],
    ['Teléfono', p.telefono || '—'], ['Email', p.email || '—'], ['Web', p.web || '—'],
    ['Calificación', '⭐'.repeat(p.calificacion || 0) || '—'], ['Notas', p.notas || '—'],
  ]
  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-900">{p.nombre}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-3">
          <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
            <tbody>
              {rows.map(([k, v], i) => (
                <tr key={k} className={i % 2 ? 'bg-gray-50/60' : 'bg-white'}>
                  <td className="px-3 py-2 text-gray-500 font-medium border-r border-gray-100 w-1/3 align-top">{k}</td>
                  <td className="px-3 py-2 text-gray-800 break-words whitespace-pre-wrap capitalize">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          {p.telefono && <a href={`https://wa.me/${p.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><Share2 size={14} /> WhatsApp</a>}
          <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90"><Pencil size={14} /> Editar</button>
        </div>
      </div>
    </div>
  )
}
