'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, X, Trash2, Loader2, Check, Users, Download, UserCheck, User, Briefcase, Mail, Phone, MapPin, Flag } from 'lucide-react'
import { RowActions, type RecordView } from '@/components/registros/row-actions'
import { MapsSearch } from '@/components/registros/maps-search'
import { cn } from '@/lib/utils'
import { alertDialog, confirmDialog } from '@/lib/dialogs'
import { StatusBadge, KpiCard, SearchBar, FormField, inputCls, useCanWrite, Tabs, IconInput } from '@/components/registros/ui'
import { CONTACTO_ESTADOS, TIPO_DOCUMENTO, GENEROS, PROFESIONES, INTERESES, findOpt, exportCsv, exportPdf } from '@/lib/registros'

interface Contacto {
  id: string; nombre_completo: string; documento: string; tipo_documento: string; fecha_nacimiento: string | null; genero: string
  cargo: string; empresa_id: string | null; empresa_nombre: string; profesion: string
  email: string; telefono: string; whatsapp: string; linkedin: string; sitio_web: string
  pais: string; departamento: string; provincia: string; distrito: string; direccion: string
  estado: string; intereses: string[]
}
interface Emp { id: string; razon_social: string }
const CARD = 'bg-white rounded-xl border border-gray-100'

const describeContacto = (r: Contacto): RecordView => ({
  title: r.nombre_completo, subtitle: r.cargo || r.profesion, email: r.email, phone: r.whatsapp || r.telefono,
  fields: [
    { label: 'Documento', value: r.documento ? `${r.tipo_documento || ''} ${r.documento}`.trim() : '' },
    { label: 'Cargo', value: r.cargo }, { label: 'Profesión', value: r.profesion }, { label: 'Empresa', value: r.empresa_nombre },
    { label: 'Email', value: r.email }, { label: 'Teléfono', value: r.telefono }, { label: 'WhatsApp', value: r.whatsapp },
    { label: 'Ubicación', value: [r.distrito, r.provincia, r.departamento].filter(Boolean).join(', ') }, { label: 'Dirección', value: r.direccion },
    { label: 'Estado', value: r.estado },
  ],
})

export default function ClientesPage() {
  const [rows, setRows] = useState<Contacto[]>([])
  const [empresas, setEmpresas] = useState<Emp[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [editing, setEditing] = useState<Partial<Contacto> | null>(null)
  const canWrite = useCanWrite()
  const PDF_COLS = [
    { key: 'nombre_completo', label: 'Nombre' }, { key: 'profesion', label: 'Profesión' }, { key: 'empresa_nombre', label: 'Empresa' },
    { key: 'email', label: 'Email' }, { key: 'telefono', label: 'Teléfono' }, { key: 'estado', label: 'Estado' },
  ]

  function load() {
    setLoading(true)
    fetch('/api/registros/contactos').then(r => r.json()).then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])
  useEffect(() => { fetch('/api/registros/empresas').then(r => r.json()).then(d => setEmpresas(Array.isArray(d) ? d : [])).catch(() => {}) }, [])

  const shown = useMemo(() => rows.filter(r => {
    const okQ = !q || [r.nombre_completo, r.email, r.empresa_nombre, r.profesion].join(' ').toLowerCase().includes(q.toLowerCase())
    const okE = !fEstado || r.estado === fEstado
    return okQ && okE
  }), [rows, q, fEstado])

  async function save(e: Partial<Contacto>) {
    const res = await fetch('/api/registros/contactos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) })
    if (!res.ok) { const j = await res.json().catch(() => ({})); await alertDialog('Error: ' + (j.error ?? res.status)); return }
    setEditing(null); load()
  }
  async function remove(id: string) {
    if (!await confirmDialog('¿Eliminar este cliente?', { danger: true, confirmLabel: 'Eliminar' })) return
    setEditing(null)
    await fetch(`/api/registros/contactos?id=${id}`, { method: 'DELETE' }); load()
  }

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">Directorio de clientes y contactos</p>
        </div>
        <button onClick={() => setEditing({})} className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:opacity-90 active:scale-95 transition shrink-0">
          <Plus size={16} /> <span className="hidden sm:inline">Nuevo Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-5">
        <KpiCard label="Total contactos" value={rows.length} icon={<Users size={18} />} />
        <KpiCard label="Clientes" value={rows.filter(r => r.estado === 'cliente').length} icon={<UserCheck size={18} />} color="#16a34a" />
        <KpiCard label="En negociación" value={rows.filter(r => r.estado === 'negociacion').length} color="#d97706" />
        <KpiCard label="Prospectos" value={rows.filter(r => r.estado === 'prospecto').length} color="#64748b" />
      </div>

      <div className={cn(CARD, 'flex flex-wrap items-center gap-2 sm:gap-3 mb-4 p-3')}>
        <SearchBar value={q} onChange={setQ} placeholder="Buscar por nombre, email, empresa..." />
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="">Todos los estados</option>
          {CONTACTO_ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button onClick={() => exportCsv('clientes.csv', shown as unknown as Record<string, unknown>[], [
          { key: 'nombre_completo', label: 'Nombre' }, { key: 'profesion', label: 'Profesión' }, { key: 'empresa_nombre', label: 'Empresa' },
          { key: 'email', label: 'Email' }, { key: 'telefono', label: 'Teléfono' }, { key: 'estado', label: 'Estado' },
        ])} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"><Download size={15} /> <span className="hidden sm:inline">Excel</span></button>
        <button onClick={() => exportPdf('Clientes', shown as unknown as Record<string, unknown>[], PDF_COLS)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"><Download size={15} /> <span className="hidden sm:inline">PDF</span></button>
      </div>

      <div className={cn(CARD, 'p-4')}>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={26} /></div>
        : shown.length === 0 ? <p className="text-center text-gray-400 text-sm py-12">No hay clientes registrados.</p>
        : <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] font-semibold text-gray-400 uppercase border-b border-gray-100">
                <th className="py-2 pr-3">Contacto</th><th className="py-2 pr-3">Profesión</th><th className="py-2 pr-3">Empresa</th>
                <th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Estado</th><th className="py-2 text-right">Acciones</th>
              </tr></thead>
              <tbody>
                {shown.map(r => {
                  const est = findOpt(CONTACTO_ESTADOS, r.estado)
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 pr-3"><p className="font-medium text-gray-800">{r.nombre_completo}</p>{r.cargo && <p className="text-xs text-gray-400">{r.cargo}</p>}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{r.profesion || '—'}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{r.empresa_nombre || '—'}</td>
                      <td className="py-2.5 pr-3 text-gray-500">{r.email || '—'}</td>
                      <td className="py-2.5 pr-3"><StatusBadge label={est.label} cls={est.cls} /></td>
                      <td className="py-2.5 text-right whitespace-nowrap"><RowActions record={r} describe={describeContacto} onEdit={setEditing} onDelete={remove} canWrite={canWrite} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2.5">
            {shown.map(r => {
              const est = findOpt(CONTACTO_ESTADOS, r.estado)
              return (
                <div key={r.id} onClick={() => setEditing(r)} className="rounded-xl border border-gray-100 p-3 active:bg-gray-50">
                  <div className="flex items-start justify-between gap-2"><p className="font-semibold text-gray-800 text-sm">{r.nombre_completo}</p><StatusBadge label={est.label} cls={est.cls} /></div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">{r.profesion && <span>{r.profesion}</span>}{r.empresa_nombre && <span>{r.empresa_nombre}</span>}{r.email && <span>{r.email}</span>}</div>
                </div>
              )
            })}
          </div>
        </>}
      </div>

      {editing && <ContactoModal initial={editing} empresas={empresas} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />}
    </div>
  )
}

function ContactoModal({ initial, empresas, onClose, onSave, onDelete }: {
  initial: Partial<Contacto>; empresas: Emp[]; onClose: () => void; onSave: (c: Partial<Contacto>) => void; onDelete: (id: string) => void
}) {
  const [f, setF] = useState<Partial<Contacto>>({ tipo_documento: 'DNI', estado: 'prospecto', pais: 'Perú', intereses: [], ...initial })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Contacto, v: unknown) => setF(p => ({ ...p, [k]: v }))
  const isEdit = !!f.id
  const toggleInt = (i: string) => setF(p => { const a = p.intereses ?? []; return { ...p, intereses: a.includes(i) ? a.filter(x => x !== i) : [...a, i] } })
  const [tab, setTab] = useState('personal')
  async function handle() {
    if (!f.nombre_completo?.trim()) { await alertDialog('El nombre es obligatorio'); return }
    setSaving(true); await onSave(f); setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 sm:p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col text-[13px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <Tabs active={tab} onChange={setTab} tabs={[
          { id: 'personal', label: 'Personal', icon: User },
          { id: 'profesional', label: 'Profesional', icon: Briefcase },
          { id: 'contacto', label: 'Contacto', icon: Mail },
          { id: 'ubicacion', label: 'Ubicación', icon: MapPin },
          { id: 'crm', label: 'CRM', icon: Flag },
        ]} />
        <div className="p-4 overflow-y-auto flex-1">
          {tab === 'personal' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <FormField label="Nombre Completo" required className="sm:col-span-2"><IconInput icon={User} value={f.nombre_completo ?? ''} onChange={e => set('nombre_completo', e.target.value)} /></FormField>
              <FormField label="Tipo Documento"><select value={f.tipo_documento} onChange={e => set('tipo_documento', e.target.value)} className={inputCls}>{TIPO_DOCUMENTO.map(t => <option key={t}>{t}</option>)}</select></FormField>
              <FormField label="Documento"><input value={f.documento ?? ''} onChange={e => set('documento', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Fecha Nacimiento"><input type="date" value={f.fecha_nacimiento ?? ''} onChange={e => set('fecha_nacimiento', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Género"><select value={f.genero ?? ''} onChange={e => set('genero', e.target.value)} className={inputCls}><option value="">—</option>{GENEROS.map(g => <option key={g}>{g}</option>)}</select></FormField>
            </div>
          )}
          {tab === 'profesional' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <FormField label="Cargo"><IconInput icon={Briefcase} value={f.cargo ?? ''} onChange={e => set('cargo', e.target.value)} /></FormField>
              <FormField label="Profesión"><select value={f.profesion ?? ''} onChange={e => set('profesion', e.target.value)} className={inputCls}><option value="">—</option>{PROFESIONES.map(p => <option key={p}>{p}</option>)}</select></FormField>
              <FormField label="Empresa Asociada" className="sm:col-span-2">
                <select value={f.empresa_id ?? ''} onChange={e => { const emp = empresas.find(x => x.id === e.target.value); set('empresa_id', e.target.value || null); set('empresa_nombre', emp?.razon_social ?? '') }} className={inputCls}>
                  <option value="">Seleccionar empresa (opcional)</option>
                  {empresas.map(em => <option key={em.id} value={em.id}>{em.razon_social}</option>)}
                </select>
              </FormField>
            </div>
          )}
          {tab === 'contacto' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <FormField label="Correo Electrónico"><IconInput icon={Mail} type="email" value={f.email ?? ''} onChange={e => set('email', e.target.value)} /></FormField>
              <FormField label="Teléfono"><IconInput icon={Phone} value={f.telefono ?? ''} onChange={e => set('telefono', e.target.value)} /></FormField>
              <FormField label="WhatsApp"><input value={f.whatsapp ?? ''} onChange={e => set('whatsapp', e.target.value)} className={inputCls} /></FormField>
              <FormField label="LinkedIn"><input value={f.linkedin ?? ''} onChange={e => set('linkedin', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Sitio Web" className="sm:col-span-2"><input value={f.sitio_web ?? ''} onChange={e => set('sitio_web', e.target.value)} className={inputCls} /></FormField>
            </div>
          )}
          {tab === 'ubicacion' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><MapsSearch current={{ direccion: f.direccion }}
                onSelect={r => setF(p => ({ ...p, direccion: r.direccion, pais: r.pais || 'Perú', departamento: r.departamento, provincia: r.provincia, distrito: r.distrito }))} /></div>
              <FormField label="País"><input value={f.pais ?? ''} onChange={e => set('pais', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Departamento"><input value={f.departamento ?? ''} onChange={e => set('departamento', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Provincia"><input value={f.provincia ?? ''} onChange={e => set('provincia', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Distrito"><input value={f.distrito ?? ''} onChange={e => set('distrito', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Dirección" className="sm:col-span-2"><IconInput icon={MapPin} value={f.direccion ?? ''} onChange={e => set('direccion', e.target.value)} /></FormField>
            </div>
          )}
          {tab === 'crm' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <FormField label="Estado"><select value={f.estado} onChange={e => set('estado', e.target.value)} className={inputCls}>{CONTACTO_ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></FormField>
              <FormField label="Intereses" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {INTERESES.map(i => (
                    <button key={i} type="button" onClick={() => toggleInt(i)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border', (f.intereses ?? []).includes(i) ? 'bg-brand/10 border-brand text-brand' : 'border-gray-200 text-gray-500')}>{i}</button>
                  ))}
                </div>
              </FormField>
            </div>
          )}
        </div>
        <div className="flex justify-between gap-2 px-4 py-3 border-t border-gray-100 sticky bottom-0 bg-white">
          {isEdit ? <button onClick={() => onDelete(f.id!)} className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-[13px] font-medium hover:bg-red-50 flex items-center gap-1.5"><Trash2 size={13} /> Eliminar</button> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handle} disabled={saving} className="px-4 py-2 bg-brand text-white rounded-lg text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {isEdit ? 'Guardar' : 'Crear'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
