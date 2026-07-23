'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, X, Trash2, Loader2, Check, Building2, Download, Globe, Sprout, DollarSign, MapPin, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { alertDialog, confirmDialog } from '@/lib/dialogs'
import { StatusBadge, KpiCard, SearchBar, FormField, inputCls, useCanWrite, Tabs, IconInput } from '@/components/registros/ui'
import { RowActions, type RecordView } from '@/components/registros/row-actions'
import { MapsSearch } from '@/components/registros/maps-search'
import { CATEGORIA_CLIENTE, EMPRESA_ESTADOS, TIPO_EMPRESA, SECTORES, CERTIFICACIONES, MONEDAS, findOpt, exportCsv, exportPdf } from '@/lib/registros'

interface Empresa {
  id: string; razon_social: string; nombre_comercial: string; ruc: string; tipo_empresa: string
  sector_productivo: string; estado: string; fecha_registro: string | null
  pais: string; departamento: string; provincia: string; distrito: string; direccion: string; codigo_postal: string; coordenadas: string
  tipo_cultivo: string; cultivos_principales: string; hectareas_totales: number; hectareas_productivas: number; certificaciones: string[]
  mercado_objetivo: string; volumen_anual: string; exporta: boolean
  facturacion_anual: number; moneda: string; categoria_cliente: string
  contacto_nombre: string; contacto_cargo: string; contacto_telefono: string; contacto_whatsapp: string; contacto_email: string
}

const CARD = 'bg-white rounded-xl border border-gray-100'

const describeEmpresa = (r: Empresa): RecordView => ({
  title: r.razon_social, subtitle: r.nombre_comercial || r.ruc, email: r.contacto_email, phone: r.contacto_whatsapp || r.contacto_telefono,
  fields: [
    { label: 'RUC', value: r.ruc }, { label: 'Tipo', value: r.tipo_empresa }, { label: 'Sector', value: r.sector_productivo },
    { label: 'Categoría', value: r.categoria_cliente }, { label: 'Estado', value: r.estado },
    { label: 'Ubicación', value: [r.distrito, r.provincia, r.departamento].filter(Boolean).join(', ') }, { label: 'Dirección', value: r.direccion },
    { label: 'Contacto', value: r.contacto_nombre }, { label: 'Teléfono', value: r.contacto_telefono }, { label: 'WhatsApp', value: r.contacto_whatsapp }, { label: 'Email', value: r.contacto_email },
  ],
})

export default function EmpresasPage() {
  const [rows, setRows] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [fCat, setFCat] = useState('')
  const [editing, setEditing] = useState<Partial<Empresa> | null>(null)
  const canWrite = useCanWrite()
  const PDF_COLS = [
    { key: 'razon_social', label: 'Razón Social' }, { key: 'ruc', label: 'RUC' }, { key: 'sector_productivo', label: 'Sector' },
    { key: 'categoria_cliente', label: 'Categoría' }, { key: 'contacto_nombre', label: 'Contacto' },
  ]

  function load() {
    setLoading(true)
    fetch('/api/registros/empresas').then(r => r.json()).then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const shown = useMemo(() => rows.filter(r => {
    const okQ = !q || [r.razon_social, r.nombre_comercial, r.ruc, r.contacto_nombre].join(' ').toLowerCase().includes(q.toLowerCase())
    const okC = !fCat || r.categoria_cliente === fCat
    return okQ && okC
  }), [rows, q, fCat])

  async function save(e: Partial<Empresa>) {
    const res = await fetch('/api/registros/empresas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) })
    if (!res.ok) { const j = await res.json().catch(() => ({})); await alertDialog('Error: ' + (j.error ?? res.status)); return }
    setEditing(null); load()
  }
  async function remove(id: string) {
    if (!await confirmDialog('¿Eliminar esta empresa?', { danger: true, confirmLabel: 'Eliminar' })) return
    setEditing(null)
    await fetch(`/api/registros/empresas?id=${id}`, { method: 'DELETE' }); load()
  }

  const kpiExporta = rows.filter(r => r.exporta).length

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">Directorio de empresas y organizaciones</p>
        </div>
        <button onClick={() => setEditing({})} className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:opacity-90 active:scale-95 transition shrink-0">
          <Plus size={16} /> <span className="hidden sm:inline">Nueva Empresa</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-5">
        <KpiCard label="Total empresas" value={rows.length} icon={<Building2 size={18} />} />
        <KpiCard label="Exportadoras" value={kpiExporta} icon={<Globe size={18} />} color="#2563eb" />
        <KpiCard label="Clientes" value={rows.filter(r => r.categoria_cliente === 'cliente').length} icon={<Sprout size={18} />} color="#16a34a" />
        <KpiCard label="Premium" value={rows.filter(r => r.categoria_cliente === 'premium').length} icon={<DollarSign size={18} />} color="#d97706" />
      </div>

      <div className={cn(CARD, 'flex flex-wrap items-center gap-2 sm:gap-3 mb-4 p-3')}>
        <SearchBar value={q} onChange={setQ} placeholder="Buscar por razón social, RUC, contacto..." />
        <select value={fCat} onChange={e => setFCat(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="">Todas las categorías</option>
          {CATEGORIA_CLIENTE.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button onClick={() => exportCsv('empresas.csv', shown as unknown as Record<string, unknown>[], [
          { key: 'razon_social', label: 'Razón Social' }, { key: 'ruc', label: 'RUC' }, { key: 'tipo_empresa', label: 'Tipo' },
          { key: 'sector_productivo', label: 'Sector' }, { key: 'categoria_cliente', label: 'Categoría' }, { key: 'contacto_nombre', label: 'Contacto' }, { key: 'contacto_email', label: 'Email' },
        ])} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"><Download size={15} /> <span className="hidden sm:inline">Excel</span></button>
        <button onClick={() => exportPdf('Empresas', shown as unknown as Record<string, unknown>[], PDF_COLS)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"><Download size={15} /> <span className="hidden sm:inline">PDF</span></button>
      </div>

      <div className={cn(CARD, 'p-4')}>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={26} /></div>
        : shown.length === 0 ? <p className="text-center text-gray-400 text-sm py-12">No hay empresas registradas.</p>
        : <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] font-semibold text-gray-400 uppercase border-b border-gray-100">
                <th className="py-2 pr-3">Empresa</th><th className="py-2 pr-3">RUC</th><th className="py-2 pr-3">Sector</th>
                <th className="py-2 pr-3">Categoría</th><th className="py-2 pr-3">Estado</th><th className="py-2 text-right">Acciones</th>
              </tr></thead>
              <tbody>
                {shown.map(r => {
                  const cat = findOpt(CATEGORIA_CLIENTE, r.categoria_cliente); const est = findOpt(EMPRESA_ESTADOS, r.estado)
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 pr-3"><p className="font-medium text-gray-800">{r.razon_social}</p>{r.nombre_comercial && <p className="text-xs text-gray-400">{r.nombre_comercial}</p>}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{r.ruc || '—'}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{r.sector_productivo || '—'}</td>
                      <td className="py-2.5 pr-3"><StatusBadge label={cat.label} cls={cat.cls} /></td>
                      <td className="py-2.5 pr-3"><StatusBadge label={est.label} cls={est.cls} /></td>
                      <td className="py-2.5 text-right whitespace-nowrap"><RowActions record={r} describe={describeEmpresa} onEdit={setEditing} onDelete={remove} canWrite={canWrite} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2.5">
            {shown.map(r => {
              const cat = findOpt(CATEGORIA_CLIENTE, r.categoria_cliente)
              return (
                <div key={r.id} onClick={() => setEditing(r)} className="rounded-xl border border-gray-100 p-3 active:bg-gray-50">
                  <div className="flex items-start justify-between gap-2"><p className="font-semibold text-gray-800 text-sm">{r.razon_social}</p><StatusBadge label={cat.label} cls={cat.cls} /></div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">{r.ruc && <span>RUC {r.ruc}</span>}{r.sector_productivo && <span>{r.sector_productivo}</span>}{r.contacto_nombre && <span>{r.contacto_nombre}</span>}</div>
                </div>
              )
            })}
          </div>
        </>}
      </div>

      {editing && <EmpresaModal initial={editing} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />}
    </div>
  )
}

function EmpresaModal({ initial, onClose, onSave, onDelete }: {
  initial: Partial<Empresa>; onClose: () => void; onSave: (e: Partial<Empresa>) => void; onDelete: (id: string) => void
}) {
  const [f, setF] = useState<Partial<Empresa>>({ estado: 'activo', categoria_cliente: 'prospecto', moneda: 'PEN', pais: 'Perú', exporta: false, certificaciones: [], ...initial })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Empresa, v: unknown) => setF(p => ({ ...p, [k]: v }))
  const isEdit = !!f.id
  const toggleCert = (c: string) => setF(p => { const arr = p.certificaciones ?? []; return { ...p, certificaciones: arr.includes(c) ? arr.filter(x => x !== c) : [...arr, c] } })
  async function handle() {
    if (!f.razon_social?.trim()) { await alertDialog('La razón social es obligatoria'); return }
    setSaving(true); await onSave(f); setSaving(false)
  }
  const [tab, setTab] = useState('general')

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 sm:p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col text-[13px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <Tabs active={tab} onChange={setTab} tabs={[
          { id: 'general', label: 'General', icon: Building2 },
          { id: 'ubicacion', label: 'Ubicación', icon: MapPin },
          { id: 'perfil', label: 'Perfil', icon: Sprout },
          { id: 'comercial', label: 'Comercial', icon: DollarSign },
          { id: 'contacto', label: 'Contacto', icon: User },
        ]} />
        <div className="p-4 overflow-y-auto flex-1">
          {tab === 'general' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <FormField label="Razón Social" required className="sm:col-span-2"><IconInput icon={Building2} value={f.razon_social ?? ''} onChange={e => set('razon_social', e.target.value)} /></FormField>
              <FormField label="Nombre Comercial"><input value={f.nombre_comercial ?? ''} onChange={e => set('nombre_comercial', e.target.value)} className={inputCls} /></FormField>
              <FormField label="RUC"><input value={f.ruc ?? ''} onChange={e => set('ruc', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Tipo de Empresa"><select value={f.tipo_empresa ?? ''} onChange={e => set('tipo_empresa', e.target.value)} className={inputCls}><option value="">—</option>{TIPO_EMPRESA.map(t => <option key={t}>{t}</option>)}</select></FormField>
              <FormField label="Sector"><select value={f.sector_productivo ?? ''} onChange={e => set('sector_productivo', e.target.value)} className={inputCls}><option value="">—</option>{SECTORES.map(t => <option key={t}>{t}</option>)}</select></FormField>
              <FormField label="Estado"><select value={f.estado} onChange={e => set('estado', e.target.value)} className={inputCls}>{EMPRESA_ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></FormField>
              <FormField label="Fecha de Registro"><input type="date" value={f.fecha_registro ?? ''} onChange={e => set('fecha_registro', e.target.value)} className={inputCls} /></FormField>
            </div>
          )}
          {tab === 'ubicacion' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><MapsSearch current={{ direccion: f.direccion, lat: f.coordenadas ? Number(String(f.coordenadas).split(',')[0]) : null, lon: f.coordenadas ? Number(String(f.coordenadas).split(',')[1]) : null }}
                onSelect={r => setF(p => ({ ...p, direccion: r.direccion, pais: r.pais || 'Perú', departamento: r.departamento, provincia: r.provincia, distrito: r.distrito, coordenadas: `${r.lat}, ${r.lon}` }))} /></div>
              <FormField label="País"><input value={f.pais ?? ''} onChange={e => set('pais', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Departamento"><input value={f.departamento ?? ''} onChange={e => set('departamento', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Provincia"><input value={f.provincia ?? ''} onChange={e => set('provincia', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Distrito"><input value={f.distrito ?? ''} onChange={e => set('distrito', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Dirección" className="sm:col-span-2"><IconInput icon={MapPin} value={f.direccion ?? ''} onChange={e => set('direccion', e.target.value)} /></FormField>
              <FormField label="Código Postal"><input value={f.codigo_postal ?? ''} onChange={e => set('codigo_postal', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Coordenadas GPS"><input value={f.coordenadas ?? ''} onChange={e => set('coordenadas', e.target.value)} placeholder="-12.04, -77.04" className={inputCls} /></FormField>
            </div>
          )}
          {tab === 'perfil' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <FormField label="Especialidad"><input value={f.tipo_cultivo ?? ''} onChange={e => set('tipo_cultivo', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Productos / Servicios"><input value={f.cultivos_principales ?? ''} onChange={e => set('cultivos_principales', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Sucursales"><input type="number" value={f.hectareas_totales ?? ''} onChange={e => set('hectareas_totales', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Años en el mercado"><input type="number" value={f.hectareas_productivas ?? ''} onChange={e => set('hectareas_productivas', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Distintivos" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {CERTIFICACIONES.map(c => (
                    <button key={c} type="button" onClick={() => toggleCert(c)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border', (f.certificaciones ?? []).includes(c) ? 'bg-brand/10 border-brand text-brand' : 'border-gray-200 text-gray-500')}>{c}</button>
                  ))}
                </div>
              </FormField>
            </div>
          )}
          {tab === 'comercial' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <FormField label="Mercado Objetivo"><input value={f.mercado_objetivo ?? ''} onChange={e => set('mercado_objetivo', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Volumen Anual"><input value={f.volumen_anual ?? ''} onChange={e => set('volumen_anual', e.target.value)} className={inputCls} /></FormField>
              <FormField label="¿Exporta?">
                <div className="flex gap-2">
                  {[{ v: true, l: 'Sí' }, { v: false, l: 'No' }].map(o => (
                    <button key={o.l} type="button" onClick={() => set('exporta', o.v)} className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium border', f.exporta === o.v ? 'bg-brand/10 border-brand text-brand' : 'border-gray-200 text-gray-500')}>{o.l}</button>
                  ))}
                </div>
              </FormField>
              <FormField label="Facturación Anual"><input type="number" value={f.facturacion_anual ?? ''} onChange={e => set('facturacion_anual', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Moneda"><select value={f.moneda} onChange={e => set('moneda', e.target.value)} className={inputCls}>{MONEDAS.map(m => <option key={m}>{m}</option>)}</select></FormField>
              <FormField label="Categoría Cliente"><select value={f.categoria_cliente} onChange={e => set('categoria_cliente', e.target.value)} className={inputCls}>{CATEGORIA_CLIENTE.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></FormField>
            </div>
          )}
          {tab === 'contacto' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <FormField label="Nombre"><IconInput icon={User} value={f.contacto_nombre ?? ''} onChange={e => set('contacto_nombre', e.target.value)} /></FormField>
              <FormField label="Cargo"><input value={f.contacto_cargo ?? ''} onChange={e => set('contacto_cargo', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Teléfono"><input value={f.contacto_telefono ?? ''} onChange={e => set('contacto_telefono', e.target.value)} className={inputCls} /></FormField>
              <FormField label="WhatsApp"><input value={f.contacto_whatsapp ?? ''} onChange={e => set('contacto_whatsapp', e.target.value)} className={inputCls} /></FormField>
              <FormField label="Correo Electrónico" className="sm:col-span-2"><input type="email" value={f.contacto_email ?? ''} onChange={e => set('contacto_email', e.target.value)} className={inputCls} /></FormField>
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
