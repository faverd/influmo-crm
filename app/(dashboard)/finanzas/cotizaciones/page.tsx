'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, FileText, CheckCircle, XCircle, Clock, Send, Eye, Trash2,
  Share2, Mail, Printer, Download, Pencil, FileSpreadsheet, ChevronDown, Filter,
} from 'lucide-react'
import { generateCotizacionPDF, type CotizacionPdfData, type CompanyBranding } from '@/lib/cotizacion-pdf'
import { downloadAsExcel } from '@/lib/excel-export'
import PdfPreviewModal from '@/components/pdf-preview-modal'
import { alertDialog, confirmDialog } from '@/lib/dialogs'

type Item = { descripcion: string; cantidad: number; precio_unitario: number; unidad: string }
type Cotizacion = {
  id: string; numero: string; cliente_nombre: string; cliente_email: string
  cliente_telefono?: string; cliente_ruc?: string; cliente_direccion?: string
  vendedor?: string; contacto?: string; cond_pago?: string; validez?: string
  tiempo_entrega?: string; lugar_entrega?: string; garantia?: string; ref_ubicacion?: string
  estado: string; moneda: string; subtotal: number; igv: number; total: number
  items: Item[]; notas: string; fecha_emision: string; fecha_vencimiento: string
  created_at: string
}

const ESTADOS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  borrador:  { label: 'Borrador',  color: 'bg-gray-100 text-gray-600',   icon: FileText },
  enviada:   { label: 'Enviada',   color: 'bg-blue-100 text-blue-700',   icon: Send },
  aprobada:  { label: 'Aprobada',  color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-700',     icon: XCircle },
  vencida:   { label: 'Vencida',   color: 'bg-orange-100 text-orange-700', icon: Clock },
}

const EMPTY_ITEM: Item = { descripcion: '', cantidad: 1, precio_unitario: 0, unidad: 'm²' }
const EMPTY_FORM = {
  cliente_nombre: '', cliente_email: '', cliente_telefono: '', cliente_ruc: '', cliente_direccion: '',
  vendedor: '', contacto: '', cond_pago: '', validez: '', tiempo_entrega: '', lugar_entrega: '',
  garantia: '', ref_ubicacion: '',
  moneda: 'PEN', fecha_vencimiento: '', notas: '',
  items: [{ ...EMPTY_ITEM }],
}

export default function CotizacionesPage() {
  const [list, setList] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [view, setView] = useState<Cotizacion | null>(null)
  const [previewCot, setPreviewCot] = useState<Cotizacion | null>(null)
  const [saving, setSaving] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [company, setCompany] = useState<CompanyBranding>({
    empresa: '', ruc: '', telefono: '', email: '', direccion: '', web: '', terminos: '', accent: '#0d9488',
  })
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => { load(); loadCompany() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/cotizaciones')
    if (r.ok) setList(await r.json())
    setLoading(false)
  }

  async function loadCompany() {
    try {
      const r = await fetch('/api/settings')
      const settings: { key: string; value: string }[] = await r.json()
      const get = (k: string) => settings.find(s => s.key === k)?.value
      setCompany({
        logoUrl: get('cot_logo') || undefined,
        empresa: get('cot_empresa') || 'Mi Empresa',
        ruc: get('cot_ruc') || '',
        telefono: get('cot_tel') || '',
        email: get('cot_email') || '',
        direccion: get('cot_direccion') || '',
        web: get('cot_web') || '',
        terminos: get('cot_terminos') || 'Precios incluyen IGV. Cotización válida según los días indicados.',
        footerHtml: get('cot_footer_html') || '',
        accent: get('brand_button_color') || get('brand_accent_color') || '#0d9488',
      })
    } catch { /* ignore */ }
  }

  const subtotal = form.items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const igv = subtotal * 0.18
  const total = subtotal + igv

  function addItem() { setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] })) }
  function removeItem(idx: number) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })) }
  function updateItem(idx: number, field: keyof Item, val: string | number) {
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }))
  }

  function openCreate() {
    setEditingId(null); setForm(EMPTY_FORM); setShowExtra(false); setModal(true)
  }

  function openEdit(c: Cotizacion) {
    setEditingId(c.id)
    setForm({
      cliente_nombre: c.cliente_nombre, cliente_email: c.cliente_email ?? '', cliente_telefono: c.cliente_telefono ?? '',
      cliente_ruc: c.cliente_ruc ?? '', cliente_direccion: c.cliente_direccion ?? '',
      vendedor: c.vendedor ?? '', contacto: c.contacto ?? '', cond_pago: c.cond_pago ?? '', validez: c.validez ?? '',
      tiempo_entrega: c.tiempo_entrega ?? '', lugar_entrega: c.lugar_entrega ?? '', garantia: c.garantia ?? '',
      ref_ubicacion: c.ref_ubicacion ?? '',
      moneda: c.moneda, fecha_vencimiento: c.fecha_vencimiento ?? '', notas: c.notas ?? '',
      items: c.items?.length ? c.items : [{ ...EMPTY_ITEM }],
    })
    setShowExtra(true)
    setModal(true)
  }

  async function save() {
    if (!form.cliente_nombre.trim()) return alertDialog('Ingresa el nombre del cliente')
    setSaving(true)
    const url = editingId ? `/api/cotizaciones/${editingId}` : '/api/cotizaciones'
    const method = editingId ? 'PATCH' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (r.ok) { setModal(false); setEditingId(null); load(); setForm(EMPTY_FORM) }
    setSaving(false)
  }

  async function changeEstado(id: string, estado: string) {
    await fetch(`/api/cotizaciones/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) })
    load()
  }

  async function deleteCot(id: string, numero: string) {
    if (!await confirmDialog(`¿Eliminar la cotización ${numero}? Esta acción no se puede deshacer.`, { danger: true, confirmLabel: 'Eliminar' })) return
    await fetch(`/api/cotizaciones/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = list.filter(c => {
    if (estadoFilter && c.estado !== estadoFilter) return false
    const q = search.toLowerCase()
    return !q || c.cliente_nombre.toLowerCase().includes(q) || c.numero.toLowerCase().includes(q) || (c.cliente_email ?? '').toLowerCase().includes(q)
  })

  const stats = {
    total: list.length,
    aprobadas: list.filter(c => c.estado === 'aprobada').length,
    pendientes: list.filter(c => ['borrador','enviada'].includes(c.estado)).length,
    monto: list.filter(c => c.estado === 'aprobada').reduce((s, c) => s + c.total, 0),
  }

  const fmt = (n: number, cur = 'PEN') => cur === 'USD' ? `$ ${n.toFixed(2)}` : `S/ ${n.toFixed(2)}`

  function toCotPdfData(c: Cotizacion): CotizacionPdfData {
    return {
      numero: c.numero, fecha_emision: c.fecha_emision, cliente_nombre: c.cliente_nombre,
      cliente_direccion: c.cliente_direccion, cliente_ruc: c.cliente_ruc, cliente_telefono: c.cliente_telefono,
      cliente_email: c.cliente_email, vendedor: c.vendedor, contacto: c.contacto, cond_pago: c.cond_pago,
      validez: c.validez, tiempo_entrega: c.tiempo_entrega, lugar_entrega: c.lugar_entrega,
      garantia: c.garantia, ref_ubicacion: c.ref_ubicacion,
      items: c.items ?? [], subtotal: c.subtotal, igv: c.igv, total: c.total, moneda: c.moneda, notas: c.notas,
    }
  }

  const buildDocFor = useCallback((c: Cotizacion) => () => generateCotizacionPDF(toCotPdfData(c), company), [company])

  function exportExcel() {
    downloadAsExcel('cotizaciones',
      ['Número', 'Cliente', 'Email', 'Fecha', 'Vencimiento', 'Estado', 'Moneda', 'Subtotal', 'IGV', 'Total'],
      filtered.map(c => [c.numero, c.cliente_nombre, c.cliente_email ?? '', c.fecha_emision, c.fecha_vencimiento ?? '', ESTADOS[c.estado]?.label ?? c.estado, c.moneda, c.subtotal.toFixed(2), c.igv.toFixed(2), c.total.toFixed(2)])
    )
  }

  async function directDownload(c: Cotizacion) {
    const doc = await generateCotizacionPDF(toCotPdfData(c), company)
    doc.save(`${c.numero}.pdf`)
  }

  async function directPrint(c: Cotizacion) {
    const doc = await generateCotizacionPDF(toCotPdfData(c), company)
    const url = doc.output('bloburl').toString()
    const win = window.open(url, '_blank')
    win?.addEventListener('load', () => win.print())
  }

  async function directShare(c: Cotizacion) {
    const doc = await generateCotizacionPDF(toCotPdfData(c), company)
    const blob = doc.output('blob')
    const file = new File([blob], `${c.numero}.pdf`, { type: 'application/pdf' })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: c.numero }) } catch { /* cancelled */ }
    } else {
      doc.save(`${c.numero}.pdf`)
    }
  }

  function directEmail(c: Cotizacion) {
    directDownload(c)
    const subject = encodeURIComponent(`Cotización ${c.numero}`)
    const body = encodeURIComponent('Adjunto encontrarás la cotización. (El PDF se descargó — adjúntalo antes de enviar.)')
    window.location.href = `mailto:${c.cliente_email ?? ''}?subject=${subject}&body=${body}`
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Cotizaciones</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">Propuestas comerciales para tus clientes</p>
        </div>
        <button onClick={openCreate} title="Nueva Cotización"
          className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2 sm:py-2 rounded-xl text-sm font-medium hover:opacity-90 transition shrink-0">
          <Plus size={16} /> <span className="hidden sm:inline">Nueva Cotización</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-700' },
          { label: 'Aprobadas', value: stats.aprobadas, color: 'text-green-600' },
          { label: 'Pendientes', value: stats.pendientes, color: 'text-blue-600' },
          { label: 'Monto Aprobado', value: fmt(stats.monto), color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-2.5 sm:p-4">
            <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1 truncate">{s.label}</p>
            <p className={`text-base sm:text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters + export */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
        </div>
        <div className="relative shrink-0">
          <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}
            title="Filtrar por estado"
            className="appearance-none w-10 sm:w-auto pl-2.5 sm:pl-3 pr-7 sm:pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 text-transparent sm:text-inherit">
            <option value="" className="text-gray-900">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k} className="text-gray-900">{v.label}</option>)}
          </select>
          <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none sm:hidden" />
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none hidden sm:block" />
        </div>
        <button onClick={exportExcel} title="Exportar a Excel"
          className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition shrink-0">
          <FileSpreadsheet size={15} className="text-green-600" /> <span className="hidden sm:inline">Excel</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No hay cotizaciones aún</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Código','Empresa','Ítems','Total','Fecha','Estado','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-brand font-semibold">{c.numero}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{c.cliente_nombre}</p>
                    {c.contacto && <p className="text-xs text-gray-400">{c.contacto}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.items?.length ?? 0}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{fmt(c.total, c.moneda)}</td>
                  <td className="px-4 py-3 text-gray-500">{c.fecha_emision}</td>
                  <td className="px-4 py-3">
                    <select value={c.estado} onChange={e => changeEstado(c.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer ${ESTADOS[c.estado]?.color ?? ESTADOS.borrador.color}`}>
                      {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setPreviewCot(c)} title="Visualizar"
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700"><Eye size={14} /></button>
                      <button onClick={() => directShare(c)} title="Compartir"
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700"><Share2 size={14} /></button>
                      <button onClick={() => directEmail(c)} title="Enviar por correo"
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700"><Mail size={14} /></button>
                      <button onClick={() => directDownload(c)} title="Descargar"
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700"><Download size={14} /></button>
                      <button onClick={() => directPrint(c)} title="Imprimir"
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700"><Printer size={14} /></button>
                      <button onClick={() => openEdit(c)} title="Editar"
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700"><Pencil size={14} /></button>
                      <button onClick={() => deleteCot(c.id, c.numero)} title="Eliminar"
                        className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva / Editar Cotización */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente *</label>
                  <input value={form.cliente_nombre} onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))}
                    placeholder="Nombre del cliente"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Moneda</label>
                  <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="PEN">S/ Soles</option>
                    <option value="USD">$ Dólares</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
                  <input value={form.cliente_email} onChange={e => setForm(f => ({ ...f, cliente_email: e.target.value }))}
                    placeholder="email@cliente.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Vencimiento</label>
                  <input type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>

              {/* Detalles adicionales (plantilla PDF) */}
              <div>
                <button onClick={() => setShowExtra(s => !s)} type="button"
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
                  <ChevronDown size={13} className={showExtra ? 'rotate-180 transition' : 'transition'} />
                  Detalles adicionales para el PDF (RUC, vendedor, entrega, garantía...)
                </button>
                {showExtra && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 bg-gray-50 rounded-xl p-4">
                    {[
                      { key: 'cliente_ruc', label: 'RUC cliente' },
                      { key: 'cliente_direccion', label: 'Dirección cliente' },
                      { key: 'cliente_telefono', label: 'Teléfono cliente' },
                      { key: 'vendedor', label: 'Vendedor' },
                      { key: 'contacto', label: 'Contacto' },
                      { key: 'cond_pago', label: 'Cond. de pago' },
                      { key: 'validez', label: 'Validez (ej: 15 días)' },
                      { key: 'tiempo_entrega', label: 'Tiempo de entrega' },
                      { key: 'lugar_entrega', label: 'Lugar de entrega' },
                      { key: 'garantia', label: 'Garantía' },
                      { key: 'ref_ubicacion', label: 'Referencia de ubicación' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                        <input value={(form as unknown as Record<string, string>)[f.key] ?? ''}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Productos / Servicios</label>
                  <button onClick={addItem} className="text-xs text-brand hover:underline flex items-center gap-1">
                    <Plus size={12} /> Agregar línea
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Descripción','Unid.','Cant.','Precio Unit.','Subtotal',''].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5">
                            <input value={item.descripcion} onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                              placeholder="Ej: Cortinas blackout"
                              className="w-full border-0 text-xs focus:outline-none bg-transparent" />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <select value={item.unidad} onChange={e => updateItem(idx, 'unidad', e.target.value)}
                              className="w-full border-0 text-xs focus:outline-none bg-transparent">
                              {['m²','ml','unidad','juego','servicio','hora'].map(u => <option key={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 w-16">
                            <input type="number" min="0" value={item.cantidad} onChange={e => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                              className="w-full border-0 text-xs focus:outline-none bg-transparent text-right" />
                          </td>
                          <td className="px-2 py-1.5 w-24">
                            <input type="number" min="0" value={item.precio_unitario} onChange={e => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              className="w-full border-0 text-xs focus:outline-none bg-transparent text-right" />
                          </td>
                          <td className="px-2 py-1.5 w-24 text-right font-semibold text-gray-700">
                            {(item.cantidad * item.precio_unitario).toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 w-8">
                            {form.items.length > 1 && (
                              <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="flex justify-end">
                <div className="w-56 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{form.moneda === 'USD' ? '$ ' : 'S/ '}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>IGV (18%)</span>
                    <span>{form.moneda === 'USD' ? '$ ' : 'S/ '}{igv.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                    <span>Total</span>
                    <span>{form.moneda === 'USD' ? '$ ' : 'S/ '}{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2} placeholder="Condiciones, tiempo de entrega, garantías..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear Cotización'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver (detalle rápido) */}
      {view && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{view.numero}</h2>
                <p className="text-sm text-gray-500">{view.cliente_nombre}</p>
              </div>
              <button onClick={() => setView(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-400">Estado: </span><span className="font-medium">{ESTADOS[view.estado]?.label}</span></div>
                <div><span className="text-gray-400">Moneda: </span><span className="font-medium">{view.moneda}</span></div>
                <div><span className="text-gray-400">Emisión: </span><span className="font-medium">{view.fecha_emision}</span></div>
                <div><span className="text-gray-400">Vence: </span><span className="font-medium">{view.fecha_vencimiento || '—'}</span></div>
              </div>
              <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>{['Descripción','Cant.','Precio','Subtotal'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(view.items as Item[]).map((it, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{it.descripcion} ({it.unidad})</td>
                      <td className="px-3 py-2">{it.cantidad}</td>
                      <td className="px-3 py-2">{it.precio_unitario.toFixed(2)}</td>
                      <td className="px-3 py-2 font-semibold">{(it.cantidad * it.precio_unitario).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-52 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(view.subtotal, view.moneda)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>IGV 18%</span><span>{fmt(view.igv, view.moneda)}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1"><span>Total</span><span>{fmt(view.total, view.moneda)}</span></div>
                </div>
              </div>
              {view.notas && <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{view.notas}</div>}
            </div>
          </div>
        </div>
      )}

      {/* PDF preview modal */}
      {previewCot && (
        <PdfPreviewModal
          title={`${previewCot.numero} · ${company.empresa}`}
          filename={`${previewCot.numero}.pdf`}
          buildDoc={buildDocFor(previewCot)}
          emailTo={previewCot.cliente_email}
          emailSubject={`Cotización ${previewCot.numero}`}
          onClose={() => setPreviewCot(null)}
        />
      )}
    </div>
  )
}
