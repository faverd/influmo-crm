'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, X, Trash2, Pencil, Loader2, FileSignature, Eye, Printer, Download, Send, Copy,
  ArrowLeft, Check, Search, Braces, ChevronRight, ChevronDown, FileText, Settings2,
  ZoomIn, ZoomOut, Undo2, Redo2, Map as MapIcon, BookOpen, Image as ImageIcon, Palette,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link2, Highlighter, Eraser,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { alertDialog, confirmDialog, promptDialog } from '@/lib/dialogs'
import { PLANTILLA_TIPOS, PAPELES, papelById, CAMPO_GRUPOS, QUICK_START, renderTokens } from '@/lib/plantillas'

interface Plantilla {
  id: string; nombre: string; tipo: string; activo: boolean
  contenido: string; encabezado: string; pie: string; tamano_papel: string
  config: {
    headerOn?: boolean; footerOn?: boolean
    margins?: { t: number; b: number; l: number; r: number }
    bgImage?: string; bgColor?: string; css?: string
    pageNum?: { on?: boolean; pos?: 'left' | 'center' | 'right'; size?: number; color?: string }
    headerCfg?: { bgImage?: string; pos?: 'arriba' | 'abajo'; firstOnly?: boolean }
    lineItems?: { size?: number; showSummary?: boolean; headBg?: string; headText?: string; css?: string }
  }
}
const DEF_MARGIN = { t: 0.5, b: 0.5, l: 0.6, r: 0.6 }
type Setting = { key: string; value: string }

const EMPTY = (tipo: string): Partial<Plantilla> => ({
  nombre: '', tipo, activo: true, tamano_papel: 'A4',
  encabezado: QUICK_START[tipo]?.encabezado ?? '', contenido: QUICK_START[tipo]?.contenido ?? '<p></p>', pie: QUICK_START[tipo]?.pie ?? '',
  config: { headerOn: !!QUICK_START[tipo]?.encabezado, footerOn: !!QUICK_START[tipo]?.pie },
})

function buildData(settings: Setting[], rec?: Record<string, unknown>): Record<string, string> {
  const get = (k: string) => settings.find(s => s.key === k)?.value || ''
  const now = new Date()
  const d: Record<string, string> = {
    'comun.fecha': now.toLocaleDateString('es-PE'),
    'comun.fecha_larga': now.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }),
    'comun.empresa': get('cot_empresa') || get('brand_app_name') || 'Mi Empresa',
    'comun.ruc': get('cot_ruc'), 'comun.direccion': get('cot_direccion'),
    'comun.telefono': get('cot_tel'), 'comun.email': get('cot_email'), 'comun.web': get('cot_web'),
  }
  if (rec) {
    const s = (k: string) => (rec[k] != null ? String(rec[k]) : '')
    d['cliente.nombre'] = s('name') || s('razon_social') || s('nombre')
    d['cliente.ruc'] = s('ruc') || s('dni')
    d['cliente.direccion'] = s('direccion') || s('address')
    d['cliente.email'] = s('email')
    d['cliente.telefono'] = s('phone') || s('telefono')
    d['contacto.nombre'] = s('name') || s('nombre')
    d['contacto.email'] = s('email')
    d['contacto.telefono'] = s('phone') || s('telefono')
  }
  return d
}

function composeHtml(pl: Partial<Plantilla>, data: Record<string, string>, marcarVacios = false) {
  const head = pl.config?.headerOn && pl.encabezado ? renderTokens(pl.encabezado, data, { marcarVacios }) : ''
  const body = renderTokens(pl.contenido || '', data, { marcarVacios })
  const foot = pl.config?.footerOn && pl.pie ? renderTokens(pl.pie, data, { marcarVacios }) : ''
  return { head, body, foot }
}

function pageHtml(pl: Partial<Plantilla>, data: Record<string, string>) {
  const { head, body, foot } = composeHtml(pl, data)
  const p = papelById(pl.tamano_papel || 'A4')
  const m = pl.config?.margins ?? DEF_MARGIN
  const bg = pl.config?.bgColor && pl.config.bgColor !== 'none' ? `background:${pl.config.bgColor};` : ''
  const bgImg = pl.config?.bgImage ? `background-image:url('${pl.config.bgImage}');background-size:cover;background-repeat:no-repeat;` : ''
  const pn = pl.config?.pageNum
  let pnCss = ''
  if (pn?.on) {
    const box = pn.pos === 'left' ? '@bottom-left' : pn.pos === 'right' ? '@bottom-right' : '@bottom-center'
    pnCss = `@page{ ${box}{ content: counter(page); font-size:${pn.size || 10}px; color:${pn.color || '#666'} } }`
  }
  const li = pl.config?.lineItems
  let liCss = ''
  if (li) liCss = `table{border-collapse:collapse;width:100%;font-size:${li.size || 13}px} table th{background:${li.headBg || '#000'};color:${li.headText || '#fff'};padding:6px 8px;text-align:left} table td{padding:6px 8px;border-bottom:1px solid #eee} ${li.css || ''}`
  const headBg = pl.config?.headerCfg?.bgImage ? `background-image:url('${pl.config.headerCfg.bgImage}');background-size:cover;` : ''
  const headerHtml = head ? `<div class="h" style="${headBg}">${head}</div>` : ''
  const footHtml = foot ? `<div class="f">${foot}</div>` : ''
  const headPos = pl.config?.headerCfg?.pos === 'abajo'
  return `<!doctype html><html><head><meta charset="utf-8"><title>${pl.nombre || 'Documento'}</title>
    <style>@page{size:${p.id === 'Carta' ? 'letter' : p.id};margin:${m.t}in ${m.r}in ${m.b}in ${m.l}in}
    ${pnCss}
    body{font-family:Arial,sans-serif;color:#111;font-size:13px;line-height:1.55;${bg}${bgImg}}
    .h{margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:8px}
    .f{margin-top:22px;border-top:1px solid #eee;padding-top:8px}
    img{max-width:100%}
    ${liCss}
    ${pl.config?.css ?? ''}</style></head>
    <body>${headPos ? '' : headerHtml}<div>${body}</div>${headPos ? headerHtml : ''}${footHtml}
    <script>window.onload=()=>window.print()</script></body></html>`
}

// ── Editor de texto enriquecido (contentEditable + execCommand) ──
const FONTS = ['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Helvetica']
const SIZES: { v: string; label: string }[] = [
  { v: '1', label: '8' }, { v: '2', label: '10' }, { v: '3', label: '12' },
  { v: '4', label: '14' }, { v: '5', label: '18' }, { v: '6', label: '24' }, { v: '7', label: '36' },
]

function RichEditor({ value, onChange, apiRef, minH = 200 }: {
  value: string; onChange: (v: string) => void
  apiRef?: React.MutableRefObject<{ insert: (h: string) => void } | null>
  minH?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!apiRef) return
    apiRef.current = {
      insert: (h: string) => {
        ref.current?.focus()
        document.execCommand('insertHTML', false, h)
        if (ref.current) onChange(ref.current.innerHTML)
      },
    }
  }, [apiRef, onChange])

  const sync = () => { if (ref.current) onChange(ref.current.innerHTML) }
  const exec = (cmd: string, val?: string) => {
    ref.current?.focus()
    if (cmd === 'hiliteColor' || cmd === 'foreColor') document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(cmd, false, val)
    sync()
  }
  const btn = (title: string, onClick: () => void, icon: React.ReactNode) => (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); onClick() }}
      className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition shrink-0">{icon}</button>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/60 flex-wrap">
        {btn('Deshacer', () => exec('undo'), <Undo2 size={14} />)}
        {btn('Rehacer', () => exec('redo'), <Redo2 size={14} />)}
        <span className="w-px h-4 bg-gray-200 mx-0.5" />
        <select onChange={e => exec('fontName', e.target.value)} defaultValue="Arial"
          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white h-7 max-w-[92px]">
          {FONTS.map(f => <option key={f}>{f}</option>)}
        </select>
        <select onChange={e => exec('fontSize', e.target.value)} defaultValue="3"
          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white h-7 w-12">
          {SIZES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <span className="w-px h-4 bg-gray-200 mx-0.5" />
        {btn('Negrita', () => exec('bold'), <Bold size={14} />)}
        {btn('Cursiva', () => exec('italic'), <Italic size={14} />)}
        {btn('Subrayado', () => exec('underline'), <Underline size={14} />)}
        {btn('Tachado', () => exec('strikeThrough'), <Strikethrough size={14} />)}
        <label className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition shrink-0 cursor-pointer relative" title="Color de texto">
          <Palette size={14} />
          <input type="color" onChange={e => exec('foreColor', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        {btn('Resaltar', () => exec('hiliteColor', '#fef08a'), <Highlighter size={14} />)}
        {btn('Quitar formato', () => exec('removeFormat'), <Eraser size={14} />)}
        <span className="w-px h-4 bg-gray-200 mx-0.5" />
        {btn('Viñetas', () => exec('insertUnorderedList'), <List size={14} />)}
        {btn('Numerada', () => exec('insertOrderedList'), <ListOrdered size={14} />)}
        {btn('Izquierda', () => exec('justifyLeft'), <AlignLeft size={14} />)}
        {btn('Centrar', () => exec('justifyCenter'), <AlignCenter size={14} />)}
        {btn('Derecha', () => exec('justifyRight'), <AlignRight size={14} />)}
        {btn('Justificar', () => exec('justifyFull'), <AlignJustify size={14} />)}
        <span className="w-px h-4 bg-gray-200 mx-0.5" />
        {btn('Enlace', async () => { const u = await promptDialog('URL del enlace:', '', { placeholder: 'https://...' }); if (u) exec('createLink', u) }, <Link2 size={14} />)}
        {btn('Imagen', async () => { const u = await promptDialog('URL de la imagen:', '', { placeholder: 'https://...' }); if (u) exec('insertImage', u) }, <ImageIcon size={14} />)}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={sync}
        className="px-4 py-3 text-sm leading-relaxed focus:outline-none" style={{ minHeight: minH, fontFamily: 'Arial' }} />
    </div>
  )
}

export default function PlantillasPage() {
  const [rows, setRows] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Setting[]>([])
  const [editing, setEditing] = useState<Partial<Plantilla> | null>(null)
  const [showTipo, setShowTipo] = useState(false)
  const [using, setUsing] = useState<Plantilla | null>(null)
  const [previewing, setPreviewing] = useState<Plantilla | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/plantillas').then(r => r.json()).then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => {
    load()
    fetch('/api/settings').then(r => r.json()).then(d => setSettings(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  async function save(pl: Partial<Plantilla>) {
    const res = await fetch('/api/plantillas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pl) })
    if (!res.ok) { await alertDialog('Error al guardar: ' + ((await res.json().catch(() => ({}))).error ?? res.status)); return }
    setEditing(null); load()
  }
  async function remove(id: string) {
    if (!await confirmDialog('¿Eliminar esta plantilla?', { danger: true, confirmLabel: 'Eliminar' })) return
    await fetch(`/api/plantillas?id=${id}`, { method: 'DELETE' }); load()
  }
  function duplicate(p: Plantilla) { const { id, ...rest } = p; void id; setEditing({ ...rest, nombre: p.nombre + ' (copia)' }) }

  if (editing) return <Editor initial={editing} settings={settings} onClose={() => setEditing(null)} onSave={save} />

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2"><FileSignature size={22} className="text-brand" /> Plantillas</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">Membretados, contratos, oficios y comunicados · editor tipo Word, campos automáticos, PDF y envío masivo</p>
        </div>
        <button onClick={() => setShowTipo(true)} className="flex items-center gap-1.5 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"><Plus size={16} /> <span className="hidden sm:inline">Nueva plantilla</span></button>
      </div>

      {/* Accesos rápidos por tipo */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
        {PLANTILLA_TIPOS.map(t => (
          <button key={t.id} onClick={() => setEditing(EMPTY(t.id))}
            className="bg-white rounded-xl border border-gray-100 p-3 text-center hover:shadow-md transition">
            <div className="text-2xl">{t.icon}</div><p className="text-[11px] sm:text-xs font-medium text-gray-700 mt-1">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        {loading ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-gray-300" /></div>
          : rows.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">Aún no hay plantillas. Crea una con los botones de arriba.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-3">Nombre</th><th className="py-2 pr-3">Tipo</th><th className="py-2 pr-3 hidden sm:table-cell">Papel</th><th className="py-2 pr-3 hidden sm:table-cell">Estado</th><th className="py-2 text-right">Acciones</th>
                </tr></thead>
                <tbody>
                  {rows.map(r => {
                    const tp = PLANTILLA_TIPOS.find(t => t.id === r.tipo)
                    return (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-gray-800">{r.nombre}</td>
                        <td className="py-2.5 pr-3"><span className="text-xs whitespace-nowrap">{tp?.icon} {tp?.label}</span></td>
                        <td className="py-2.5 pr-3 text-gray-500 hidden sm:table-cell">{r.tamano_papel}</td>
                        <td className="py-2.5 pr-3 hidden sm:table-cell"><span className={cn('text-[11px] px-2 py-0.5 rounded-full', r.activo ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500')}>{r.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <button onClick={() => setPreviewing(r)} title="Visualizar" className="text-gray-400 hover:text-blue-500 p-1"><Eye size={15} /></button>
                          <button onClick={() => setUsing(r)} title="Usar / Enviar" className="text-gray-400 hover:text-brand p-1"><Send size={15} /></button>
                          <button onClick={() => setEditing(r)} title="Editar" className="text-gray-400 hover:text-amber-500 p-1"><Pencil size={15} /></button>
                          <button onClick={() => duplicate(r)} title="Duplicar" className="text-gray-400 hover:text-gray-700 p-1"><Copy size={15} /></button>
                          <button onClick={() => remove(r.id)} title="Eliminar" className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {showTipo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3" onClick={() => setShowTipo(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Nueva plantilla — elige el tipo</h2>
            <div className="grid grid-cols-3 gap-2">
              {PLANTILLA_TIPOS.map(t => (
                <button key={t.id} onClick={() => { setEditing(EMPTY(t.id)); setShowTipo(false) }} className="rounded-xl border border-gray-200 p-3 text-center hover:border-brand hover:bg-brand/5">
                  <div className="text-2xl">{t.icon}</div><p className="text-xs font-medium text-gray-700 mt-1">{t.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {using && <UsarModal pl={using} settings={settings} onClose={() => setUsing(null)} />}
      {previewing && <PreviewModal pl={previewing} data={buildData(settings)} onClose={() => setPreviewing(null)} />}
    </div>
  )
}

// ── Editor tipo Word ──
function Editor({ initial, settings, onClose, onSave }: {
  initial: Partial<Plantilla>; settings: Setting[]; onClose: () => void; onSave: (p: Partial<Plantilla>) => void
}) {
  const [f, setF] = useState<Partial<Plantilla>>({ config: {}, ...initial })
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [active, setActive] = useState<'body' | 'head' | 'foot'>('body')
  const [q, setQ] = useState('')
  const [openSec, setOpenSec] = useState<string>('props')
  const [openGrp, setOpenGrp] = useState<Set<string>>(new Set(['comun']))
  const [zoom, setZoom] = useState(100)
  const [printLayout, setPrintLayout] = useState(false)
  const [pages, setPages] = useState(1)
  const docRef = useRef<HTMLDivElement>(null)
  const set = (k: keyof Plantilla, v: unknown) => setF(p => ({ ...p, [k]: v }))
  const setCfg = (k: string, v: unknown) => setF(p => ({ ...p, config: { ...p.config, [k]: v } }))
  const mg = f.config?.margins ?? DEF_MARGIN
  const setMargin = (k: 't' | 'b' | 'l' | 'r', v: number) => setCfg('margins', { ...mg, [k]: v })
  const pn = f.config?.pageNum ?? {}
  const setPN = (k: string, v: unknown) => setCfg('pageNum', { ...pn, [k]: v })
  const li = f.config?.lineItems ?? {}
  const setLI = (k: string, v: unknown) => setCfg('lineItems', { ...li, [k]: v })
  const papel = papelById(f.tamano_papel || 'A4')

  useEffect(() => {
    const el = docRef.current; if (!el) return
    const t = setTimeout(() => setPages(Math.max(1, Math.ceil(el.scrollHeight / papel.h))), 60)
    return () => clearTimeout(t)
  }, [f.contenido, f.encabezado, f.pie, f.tamano_papel, papel.h])

  function readImage(e: React.ChangeEvent<HTMLInputElement>, cb: (dataUrl: string) => void) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => cb(String(reader.result))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const bodyApi = useRef<{ insert: (h: string) => void } | null>(null)
  const headApi = useRef<{ insert: (h: string) => void } | null>(null)
  const footApi = useRef<{ insert: (h: string) => void } | null>(null)

  function insertToken(token: string) {
    const api = active === 'head' ? headApi.current : active === 'foot' ? footApi.current : bodyApi.current
    api?.insert(`{{${token}}}`)
  }
  async function handleSave() {
    if (!f.nombre?.trim()) { await alertDialog('Ponle un nombre a la plantilla'); return }
    setSaving(true); await onSave(f); setSaving(false)
  }
  const data = useMemo(() => buildData(settings), [settings])
  const grupos = CAMPO_GRUPOS.map(g => ({ ...g, campos: g.campos.filter(c => !q || c.label.toLowerCase().includes(q.toLowerCase()) || c.token.includes(q.toLowerCase())) })).filter(g => g.campos.length)
  const headerOn = !!f.config?.headerOn, footerOn = !!f.config?.footerOn

  const Sec = ({ id, title, icon: Ic, children }: { id: string; title: string; icon?: React.ElementType; children: React.ReactNode }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpenSec(s => s === id ? '' : id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
        {Ic && <Ic size={15} className="text-brand" />}<span className="flex-1 text-left">{title}</span>
        {openSec === id ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
      </button>
      {openSec === id && <div className="px-3 pb-3 pt-1 border-t border-gray-100">{children}</div>}
    </div>
  )
  const chip = (on: boolean) => cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium', on ? 'border-brand bg-brand/10 text-brand' : 'border-gray-200 text-gray-600 hover:bg-gray-50')

  return (
    <div className="fixed inset-0 z-[70] bg-gray-50 flex flex-col">
      {/* Barra superior */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100">
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={18} /></button>
        <input value={f.nombre ?? ''} onChange={e => set('nombre', e.target.value)} placeholder="Nombre de la plantilla" className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium flex-1 max-w-xs" />
        <div className="flex-1" />
        <button onClick={() => setPreview(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand/20 text-brand text-sm font-medium hover:bg-brand/5"><Eye size={15} /> Avance</button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} <span className="hidden sm:inline">Guardar plantilla</span></button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Panel izquierdo: acordeón */}
        <div className="w-72 shrink-0 border-r border-gray-100 bg-white overflow-y-auto p-3 space-y-2 hidden md:block">
          <Sec id="props" title="Propiedades de la plantilla" icon={Settings2}>
            <div className="space-y-2.5 pt-1">
              <label className="flex items-center justify-between text-xs font-medium text-gray-600">Activo
                <input type="checkbox" checked={!!f.activo} onChange={e => set('activo', e.target.checked)} className="scale-110" /></label>
              <div><label className="text-[11px] text-gray-500 block mb-0.5">Nombre</label><input value={f.nombre ?? ''} onChange={e => set('nombre', e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" /></div>
              <div><label className="text-[11px] text-gray-500 block mb-0.5">Tipo</label><select value={f.tipo} onChange={e => set('tipo', e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">{PLANTILLA_TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Tamaño del papel</label>
                <div className="flex gap-3">{PAPELES.map(p => (
                  <label key={p.id} className="flex items-center gap-1 text-sm"><input type="radio" name="papel" checked={f.tamano_papel === p.id} onChange={() => set('tamano_papel', p.id)} /> {p.label}</label>
                ))}</div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-600 mb-1">Margen <span className="font-normal text-gray-400">(pulgadas)</span></p>
                <div className="grid grid-cols-4 gap-1.5">
                  {([['t', 'Arriba'], ['b', 'Abajo'], ['l', 'Izq.'], ['r', 'Der.']] as const).map(([k, l]) => (
                    <div key={k}><label className="text-[9px] text-gray-400 block">{l}</label><input type="number" step="0.05" value={mg[k]} onChange={e => setMargin(k, Number(e.target.value))} className="w-full border border-gray-200 rounded-md px-1.5 py-1 text-xs" /></div>
                  ))}
                </div>
              </div>
            </div>
          </Sec>

          <Sec id="estilo" title="Antecedentes y estilo" icon={Palette}>
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Imagen de fondo</label>
                {f.config?.bgImage
                  ? <div className="flex items-center gap-2">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={f.config.bgImage} alt="fondo" className="h-10 w-10 object-cover rounded border border-gray-100" /><button onClick={() => setCfg('bgImage', '')} className="text-xs text-red-500">Quitar</button></div>
                  : <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-500 cursor-pointer hover:bg-gray-50"><ImageIcon size={14} /> Subir imagen<input type="file" accept="image/*" className="hidden" onChange={e => readImage(e, u => setCfg('bgImage', u))} /></label>}
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Color de fondo</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={f.config?.bgColor && f.config.bgColor !== 'none' ? f.config.bgColor : '#ffffff'} onChange={e => setCfg('bgColor', e.target.value)} className="w-9 h-8 rounded border border-gray-200 p-0.5 bg-white" />
                  <button onClick={() => setCfg('bgColor', 'none')} className="text-xs text-gray-500 hover:text-red-500">Sin color</button>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">CSS personalizado</label>
                <textarea rows={3} value={f.config?.css ?? ''} onChange={e => setCfg('css', e.target.value)} placeholder="Estilos CSS personalizados…" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] font-mono resize-none" />
              </div>
            </div>
          </Sec>

          <Sec id="pagenum" title="Número de página" icon={FileText}>
            <div className="space-y-2.5 pt-1">
              <label className="flex items-center justify-between text-xs font-medium text-gray-600">Mostrar número de página
                <input type="checkbox" checked={!!pn.on} onChange={e => setPN('on', e.target.checked)} className="scale-110" /></label>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Posición</label>
                <div className="flex gap-3 text-sm">{([['left', 'Izq.'], ['center', 'Centro'], ['right', 'Der.']] as const).map(([v, l]) => (
                  <label key={v} className="flex items-center gap-1"><input type="radio" name="pnpos" checked={(pn.pos || 'center') === v} onChange={() => setPN('pos', v)} /> {l}</label>
                ))}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[11px] text-gray-500 block mb-0.5">Tamaño (px)</label><input type="number" value={pn.size ?? 10} onChange={e => setPN('size', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" /></div>
                <div><label className="text-[11px] text-gray-500 block mb-0.5">Color</label><input type="color" value={pn.color || '#666666'} onChange={e => setPN('color', e.target.value)} className="w-full h-8 border border-gray-200 rounded-lg p-0.5 bg-white" /></div>
              </div>
            </div>
          </Sec>

          <Sec id="lineitems" title="Elementos de línea (tablas)" icon={FileText}>
            <div className="space-y-2.5 pt-1">
              <p className="text-[10px] text-gray-400">Estilo de las tablas del documento (líneas de productos/ítems).</p>
              <div><label className="text-[11px] text-gray-500 block mb-0.5">Tamaño de fuente (px)</label><input type="number" value={li.size ?? 13} onChange={e => setLI('size', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-gray-400 block mb-0.5">Fondo cabecera</label><input type="color" value={li.headBg || '#000000'} onChange={e => setLI('headBg', e.target.value)} className="w-full h-8 border border-gray-200 rounded-lg p-0.5 bg-white" /></div>
                <div><label className="text-[10px] text-gray-400 block mb-0.5">Texto cabecera</label><input type="color" value={li.headText || '#ffffff'} onChange={e => setLI('headText', e.target.value)} className="w-full h-8 border border-gray-200 rounded-lg p-0.5 bg-white" /></div>
              </div>
            </div>
          </Sec>

          <Sec id="campos" title="Campos" icon={Braces}>
            <p className="text-[10px] text-gray-400 mb-1.5 pt-1">Insertando en: <b className="text-gray-600">{active === 'head' ? 'Encabezado' : active === 'foot' ? 'Pie' : 'Cuerpo'}</b></p>
            <div className="relative mb-2"><Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar campo…" className="w-full border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-xs" /></div>
            <div className="space-y-1">
              {grupos.map(g => {
                const open = openGrp.has(g.id) || !!q
                return (
                  <div key={g.id} className="border border-gray-100 rounded-lg">
                    <button onClick={() => setOpenGrp(s => { const n = new Set(s); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n })} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50">
                      {open ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}<span>{g.icon}</span> {g.label}
                    </button>
                    {open && <div className="flex flex-wrap gap-1 px-2 pb-2">
                      {g.campos.map(c => <button key={c.token} onClick={() => insertToken(c.token)} title={`{{${c.token}}}`} className="text-[11px] px-2 py-1 rounded-md bg-gray-50 border border-gray-100 hover:border-brand hover:bg-brand/5 text-gray-600">{c.label}</button>)}
                    </div>}
                  </div>
                )
              })}
            </div>
          </Sec>
        </div>

        {/* Columna del documento */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-b border-gray-100 flex-wrap">
            <button onClick={() => setCfg('headerOn', !headerOn)} className={chip(headerOn)}><FileText size={15} /> <span className="hidden sm:inline">Encabezado</span></button>
            <button onClick={() => setCfg('footerOn', !footerOn)} className={chip(footerOn)}><FileText size={15} /> <span className="hidden sm:inline">Pie de página</span></button>
            <div className="flex-1" />
            <button onClick={() => setPreview(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand text-white text-sm font-medium hover:opacity-90"><Eye size={15} /> Avance</button>
          </div>

          <div className="flex-1 overflow-auto p-3 sm:p-4 bg-gray-100 relative">
            <div ref={docRef} className="mx-auto space-y-3 origin-top" style={{ width: printLayout ? papel.w : 820, maxWidth: '100%', zoom: zoom / 100 }}>
              {printLayout ? (
                <div className="bg-white shadow rounded-lg border border-gray-300 relative"
                  style={{ minHeight: papel.h, backgroundColor: f.config?.bgColor && f.config.bgColor !== 'none' ? f.config.bgColor : '#fff', backgroundImage: f.config?.bgImage ? `url('${f.config.bgImage}')` : undefined, backgroundSize: 'cover' }}>
                  <div className="flex flex-col" style={{ padding: `${mg.t * 96}px ${mg.r * 96}px ${mg.b * 96}px ${mg.l * 96}px`, minHeight: papel.h }}>
                    {headerOn && <div onFocusCapture={() => setActive('head')} className="mb-2"><RichEditor value={f.encabezado ?? ''} onChange={v => set('encabezado', v)} apiRef={headApi} minH={70} /></div>}
                    <div onFocusCapture={() => setActive('body')} className="flex-1"><RichEditor value={f.contenido ?? ''} onChange={v => set('contenido', v)} apiRef={bodyApi} minH={360} /></div>
                    {footerOn && <div onFocusCapture={() => setActive('foot')} className="mt-2"><RichEditor value={f.pie ?? ''} onChange={v => set('pie', v)} apiRef={footApi} minH={60} /></div>}
                  </div>
                  {pages > 1 && Array.from({ length: pages - 1 }).map((_, i) => (
                    <div key={i} className="absolute left-0 right-0 pointer-events-none" style={{ top: (i + 1) * papel.h }}>
                      <div className="border-t-2 border-dashed border-blue-300" />
                      <span className="absolute right-2 -top-2.5 text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded-full">Página {i + 2}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {headerOn && (
                    <div onFocusCapture={() => setActive('head')}>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Contenido del encabezado</p>
                      <RichEditor value={f.encabezado ?? ''} onChange={v => set('encabezado', v)} apiRef={headApi} minH={100} />
                    </div>
                  )}
                  <div onFocusCapture={() => setActive('body')}>
                    <RichEditor value={f.contenido ?? ''} onChange={v => set('contenido', v)} apiRef={bodyApi} minH={480} />
                  </div>
                  {footerOn && (
                    <div onFocusCapture={() => setActive('foot')}>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Contenido del pie de página</p>
                      <RichEditor value={f.pie ?? ''} onChange={v => set('pie', v)} apiRef={footApi} minH={80} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Barra flotante inferior derecha */}
            <div className="sticky bottom-2 ml-auto w-fit flex items-center gap-0.5 bg-white border border-gray-200 rounded-full shadow-lg px-1.5 py-1 mt-2 mr-1">
              <FbBtn onClick={() => setZoom(z => Math.max(40, z - 10))} title="Alejar"><ZoomOut size={15} /></FbBtn>
              <button onClick={() => setZoom(100)} className="text-xs text-gray-600 w-11 text-center hover:text-brand" title="Restablecer zoom">{zoom}%</button>
              <FbBtn onClick={() => setZoom(z => Math.min(200, z + 10))} title="Acercar"><ZoomIn size={15} /></FbBtn>
              <span className="w-px h-5 bg-gray-200 mx-1" />
              <FbBtn onClick={() => setPrintLayout(v => !v)} title="Diseño de impresión" active={printLayout}><MapIcon size={15} /></FbBtn>
              <FbBtn onClick={() => setPreview(true)} title="Modo lectura"><BookOpen size={15} /></FbBtn>
              <span className="text-[11px] text-gray-500 px-2 whitespace-nowrap" title="Páginas">Pág. {pages}</span>
            </div>
          </div>
        </div>
      </div>

      {preview && <PreviewModal pl={f} data={data} onClose={() => setPreview(false)} />}
    </div>
  )
}

function FbBtn({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) {
  return <button onClick={onClick} title={title} className={cn('w-7 h-7 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100', active && 'bg-brand/10 text-brand')}>{children}</button>
}

// ── Vista previa + impresión/PDF ──
function PreviewModal({ pl, data, onClose }: { pl: Partial<Plantilla>; data: Record<string, string>; onClose: () => void }) {
  const { head, body, foot } = composeHtml(pl, data, true)
  const print = () => { const w = window.open('', '_blank', 'width=820,height=900'); if (w) { w.document.write(pageHtml(pl, data)); w.document.close() } }
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/70" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-3xl mx-auto my-3 sm:my-6 rounded-2xl shadow-2xl flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <span className="font-semibold text-gray-800 text-sm truncate">Vista previa · {pl.nombre || 'Documento'}</span>
          <div className="flex items-center gap-1.5">
            <button onClick={print} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"><Printer size={15} /> <span className="hidden sm:inline">Imprimir</span></button>
            <button onClick={print} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium"><Download size={15} /> PDF</button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="mx-auto bg-white shadow p-6 sm:p-8 text-[13px] leading-relaxed text-gray-800" style={{ maxWidth: 760, fontFamily: 'Arial' }}>
            {head && <div className="mb-3 pb-2 border-b border-gray-100" dangerouslySetInnerHTML={{ __html: head }} />}
            <div dangerouslySetInnerHTML={{ __html: body }} />
            {foot && <div className="mt-5 pt-2 border-t border-gray-100" dangerouslySetInnerHTML={{ __html: foot }} />}
          </div>
          <p className="text-center text-[11px] text-gray-300 mt-2">Los campos sin dato aparecen como [campo]. Se completan al usar la plantilla con un contacto.</p>
        </div>
      </div>
    </div>
  )
}

// ── Usar plantilla: llenado automático + envío masivo ──
function UsarModal({ pl, settings, onClose }: { pl: Plantilla; settings: Setting[]; onClose: () => void }) {
  const [recs, setRecs] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState(pl.nombre)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => {
    setLoading(true); setSel(new Set())
    fetch('/api/contactos').then(r => r.json()).then(d => setRecs(Array.isArray(d?.contacts) ? d.contacts : Array.isArray(d) ? d : [])).catch(() => setRecs([])).finally(() => setLoading(false))
  }, [])

  const nameOf = (r: Record<string, unknown>) => String(r.name || r.nombre || r.razon_social || '—')
  const emailOf = (r: Record<string, unknown>) => String(r.email || r.contacto_email || '')
  const shown = recs.filter(r => !q || nameOf(r).toLowerCase().includes(q.toLowerCase()))
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  function printOne(r: Record<string, unknown>) {
    const data = buildData(settings, r)
    const w = window.open('', '_blank', 'width=820,height=900'); if (w) { w.document.write(pageHtml(pl, data)); w.document.close() }
  }

  async function sendAll() {
    const targets = recs.filter(r => sel.has(String(r.id)))
    if (!targets.length) { await alertDialog('Selecciona al menos un destinatario'); return }
    setSending(true); let ok = 0, fail = 0; const errores: string[] = []
    for (const r of targets) {
      const to = emailOf(r); if (!to) { fail++; continue }
      const data = buildData(settings, r)
      const { head, body, foot } = composeHtml(pl, data)
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">${head ? `<div style="border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:12px">${head}</div>` : ''}${body}${foot ? `<div style="border-top:1px solid #eee;padding-top:8px;margin-top:18px">${foot}</div>` : ''}</div>`
      try {
        const res = await fetch('/api/comunicacion/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, html }) })
        if (res.ok) ok++; else { fail++; const e = await res.json().catch(() => ({})); if (e.error && !errores.includes(e.error)) errores.push(e.error) }
      } catch { fail++ }
    }
    setSending(false)
    setResult(`Enviados: ${ok} · Fallidos: ${fail}${errores.length ? ' · ' + errores[0] : ''}`)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 truncate">Usar plantilla · {pl.nombre}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar contacto…" className="w-full border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 text-sm" /></div>
          {loading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gray-300" /></div>
            : shown.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Sin contactos. Agrégalos en Gestión Contactos.</p>
            : (
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-72 overflow-auto">
                {shown.map(r => { const id = String(r.id); return (
                  <label key={id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={sel.has(id)} onChange={() => toggle(id)} />
                    <div className="flex-1 min-w-0"><p className="font-medium text-gray-800 truncate">{nameOf(r)}</p><p className="text-xs text-gray-400 truncate">{emailOf(r) || 'sin email'}</p></div>
                    <button type="button" onClick={(e) => { e.preventDefault(); printOne(r) }} title="Generar PDF" className="text-gray-400 hover:text-brand p-1"><Printer size={15} /></button>
                  </label>
                )})}
              </div>
            )}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-0.5">Asunto del correo (envío masivo)</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
          </div>
          {result && <p className="text-sm text-center font-medium text-brand">{result}</p>}
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{sel.size} seleccionado(s)</span>
          <button onClick={sendAll} disabled={sending} className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60">{sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enviar por correo</button>
        </div>
      </div>
    </div>
  )
}
