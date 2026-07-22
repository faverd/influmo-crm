'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Check, ChevronRight, ChevronDown,
  ZoomIn, ZoomOut, Monitor, Columns2, FileText,
  Eye, Bold, Italic, Underline, Strikethrough, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, List, ListOrdered,
  Link, Image, Paperclip, Smile, Undo2, Redo2, Type, Eraser,
  Highlighter, MoreHorizontal, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { promptDialog } from '@/lib/dialogs'

// ─── Templates data ─────────────────────────────────────────────────────────
const PLANTILLAS: Record<string, { nombre: string; tipo: string; headerHtml: string; bodyHtml: string; footerHtml: string }> = {
  '1': {
    nombre: 'Cotización de Cortinas',
    tipo: 'cotizacion',
    headerHtml: `<div style="text-align:center"><strong style="color:#0d9488;font-size:18px">{{comun.empresa}}</strong><br/><small>{{comun.direccion}} &nbsp;·&nbsp; {{comun.telefono}} &nbsp;·&nbsp; {{comun.email}}</small></div>`,
    bodyHtml: `<div style="text-align:right">{{comun.fecha_larga}}</div><br/>Señores<br/><strong>{{cliente.nombre}}</strong><br/>{{cliente.direccion}}<br/><br/>De nuestra consideración:<br/><br/><hr/><br/>Por medio de la presente, nos complace presentarle nuestra cotización para el proyecto de cortinas y decoración solicitado.<br/><br/>`,
    footerHtml: `<div style="text-align:center;font-size:11px;color:#666">{{comun.empresa}} · {{comun.web}} · {{comun.telefono}}</div>`,
  },
  '2': {
    nombre: 'Propuesta de Decoración Integral',
    tipo: 'propuesta',
    headerHtml: `<div style="text-align:center"><strong style="color:#0d9488;font-size:18px">{{comun.empresa}}</strong><br/><small>Decoración de Interiores</small></div>`,
    bodyHtml: `<div style="text-align:right">{{comun.fecha_larga}}</div><br/>Estimado/a <strong>{{cliente.nombre}}</strong>,<br/><br/>Es un placer presentarle nuestra propuesta integral para el proyecto de decoración de interiores de <strong>{{proyecto.nombre}}</strong>.<br/><br/>`,
    footerHtml: `<div style="text-align:center;font-size:11px;color:#666">{{comun.empresa}} — Decoración de Interiores Premium</div>`,
  },
  '3': { nombre: 'Contrato de Servicios', tipo: 'contrato', headerHtml: `<strong style="color:#0d9488;font-size:16px">CONTRATO DE SERVICIOS DE DECORACIÓN</strong><br/><small>{{comun.empresa}}</small>`, bodyHtml: `Conste por el presente documento el contrato de servicios entre <strong>{{comun.empresa}}</strong> y el cliente <strong>{{cliente.nombre}}</strong> con RUC {{cliente.ruc}}.<br/><br/><strong>CLÁUSULA 1 — OBJETO:</strong><br/>`, footerHtml: `<small>Firma del contratante: ___________________________ &nbsp;&nbsp; Firma del cliente: ___________________________</small>` },
  '4': { nombre: 'Orden de Trabajo', tipo: 'orden', headerHtml: `<strong style="color:#0d9488">ORDEN DE TRABAJO #{{orden.numero}}</strong><br/><small>{{comun.empresa}} — {{comun.fecha_larga}}</small>`, bodyHtml: `<strong>Técnico asignado:</strong> {{tecnico.nombre}}<br/><strong>Cliente:</strong> {{cliente.nombre}}<br/><strong>Dirección:</strong> {{cliente.direccion}}<br/><br/><strong>Descripción del trabajo:</strong><br/>`, footerHtml: `<small>Firma del técnico: ___________________ Firma del cliente: ___________________</small>` },
  '5': { nombre: 'Factura de Servicio', tipo: 'factura', headerHtml: `<strong style="color:#0d9488;font-size:18px">{{comun.empresa}}</strong><br/><small>RUC: {{comun.ruc}} · {{comun.email}}</small>`, bodyHtml: `<strong>FACTURA N° {{factura.numero}}</strong><br/>Fecha: {{comun.fecha_larga}}<br/><br/>Cliente: {{cliente.nombre}}<br/>RUC: {{cliente.ruc}}<br/><br/>`, footerHtml: `<small>Subtotal: {{factura.subtotal}} · IGV (18%): {{factura.igv}} · <strong>Total: {{factura.total}}</strong></small>` },
  '6': { nombre: 'Garantía de Producto', tipo: 'garantia', headerHtml: `<strong style="color:#0d9488">CERTIFICADO DE GARANTÍA</strong><br/><small>{{comun.empresa}}</small>`, bodyHtml: `Se certifica que el producto <strong>{{producto.nombre}}</strong> instalado en las instalaciones de <strong>{{cliente.nombre}}</strong> el día {{instalacion.fecha}} cuenta con garantía de <strong>{{garantia.plazo}}</strong> meses.<br/><br/>`, footerHtml: `<small>{{comun.empresa}} — Este certificado es válido con sello y firma autorizada.</small>` },
}

// ─── Campo tokens ────────────────────────────────────────────────────────────
const CAMPO_GROUPS = [
  {
    label: 'Comunes',
    tokens: [
      { token: '{{comun.empresa}}',    desc: 'Nombre empresa' },
      { token: '{{comun.ruc}}',        desc: 'RUC' },
      { token: '{{comun.direccion}}',  desc: 'Dirección' },
      { token: '{{comun.telefono}}',   desc: 'Teléfono' },
      { token: '{{comun.email}}',      desc: 'Email' },
      { token: '{{comun.web}}',        desc: 'Sitio web' },
      { token: '{{comun.fecha_larga}}',desc: 'Fecha completa' },
      { token: '{{comun.fecha}}',      desc: 'Fecha corta' },
    ],
  },
  {
    label: 'Cliente',
    tokens: [
      { token: '{{cliente.nombre}}',   desc: 'Nombre cliente' },
      { token: '{{cliente.ruc}}',      desc: 'RUC cliente' },
      { token: '{{cliente.direccion}}',desc: 'Dirección cliente' },
      { token: '{{cliente.email}}',    desc: 'Email cliente' },
      { token: '{{cliente.telefono}}', desc: 'Teléfono cliente' },
    ],
  },
  {
    label: 'Cotización',
    tokens: [
      { token: '{{cotizacion.numero}}',desc: 'Número cotización' },
      { token: '{{cotizacion.total}}', desc: 'Total cotización' },
      { token: '{{cotizacion.fecha}}', desc: 'Fecha cotización' },
      { token: '{{cotizacion.igv}}',   desc: 'IGV (18%)' },
    ],
  },
  {
    label: 'Proyecto',
    tokens: [
      { token: '{{proyecto.nombre}}',  desc: 'Nombre proyecto' },
      { token: '{{proyecto.tipo}}',    desc: 'Tipo proyecto' },
    ],
  },
]

// ─── Rich Text Toolbar ───────────────────────────────────────────────────────
const FONTS = ['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Helvetica']
const SIZES = ['10','11','12','14','16','18','20','24','28','36']

function Toolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement | null> }) {
  const [font, setFont] = useState('Arial')
  const [size, setSize] = useState('12')

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }

  const btn = (title: string, onClick: () => void, children: React.ReactNode, active = false) => (
    <button title={title} onMouseDown={e => { e.preventDefault(); onClick() }}
      className={cn('p-1 rounded hover:bg-gray-200 transition shrink-0',
        active ? 'bg-gray-200 text-gray-900' : 'text-gray-600')}>
      {children}
    </button>
  )

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-white flex-wrap">
      {btn('Deshacer', () => exec('undo'), <Undo2 size={13} />)}
      {btn('Rehacer', () => exec('redo'), <Redo2 size={13} />)}
      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {/* Font */}
      <select value={font} onChange={e => { setFont(e.target.value); exec('fontName', e.target.value) }}
        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none h-7 min-w-[90px]">
        {FONTS.map(f => <option key={f}>{f}</option>)}
      </select>
      <select value={size} onChange={e => { setSize(e.target.value); exec('fontSize', '7'); /* workaround */ }}
        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none h-7 w-14">
        {SIZES.map(s => <option key={s}>{s}</option>)}
      </select>
      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {btn('Negrita', () => exec('bold'), <Bold size={13} />)}
      {btn('Cursiva', () => exec('italic'), <Italic size={13} />)}
      {btn('Subrayado', () => exec('underline'), <Underline size={13} />)}
      {btn('Tachado', () => exec('strikeThrough'), <Strikethrough size={13} />)}
      {btn('Resaltar', () => exec('hiliteColor', '#fef08a'), <Highlighter size={13} />)}
      {btn('Quitar formato', () => exec('removeFormat'), <Eraser size={13} />)}
      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {btn('Lista viñetas', () => exec('insertUnorderedList'), <List size={13} />)}
      {btn('Lista numerada', () => exec('insertOrderedList'), <ListOrdered size={13} />)}
      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {btn('Izquierda', () => exec('justifyLeft'), <AlignLeft size={13} />)}
      {btn('Centrar', () => exec('justifyCenter'), <AlignCenter size={13} />)}
      {btn('Derecha', () => exec('justifyRight'), <AlignRight size={13} />)}
      {btn('Justificar', () => exec('justifyFull'), <AlignJustify size={13} />)}
      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {btn('Enlace', async () => {
        const url = await promptDialog('URL del enlace:', '', { placeholder: 'https://...' })
        if (url) exec('createLink', url)
      }, <Link size={13} />)}
      {btn('Imagen', async () => {
        const url = await promptDialog('URL de la imagen:', '', { placeholder: 'https://...' })
        if (url) exec('insertImage', url)
      }, <Image size={13} />)}
      {btn('Adjunto', () => {}, <Paperclip size={13} />)}
      {btn('Emoji', () => {}, <Smile size={13} />)}
      {btn('Más', () => {}, <MoreHorizontal size={13} />)}
    </div>
  )
}

// ─── Editor Zone ─────────────────────────────────────────────────────────────
function EditorZone({ label, html, onChange, zoom }: {
  label: string
  html: string
  onChange: (v: string) => void
  zoom: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mb-0">
      <p className="text-xs font-semibold text-gray-500 px-6 py-2 bg-gray-100 border-b border-gray-200">{label}</p>
      <Toolbar editorRef={ref} />
      {/* Extra toolbar row */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-white">
        <button className="p-1 rounded hover:bg-gray-200 text-gray-500 transition"><Type size={13} /></button>
        <button className="p-1 rounded hover:bg-gray-200 text-gray-500 transition text-xs font-bold">···</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML) }}
        className="focus:outline-none p-6 min-h-[80px] bg-white text-sm leading-relaxed"
        style={{ fontSize: `${12 * zoom / 100}px` }}
      />
    </div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function PropSection({ label, icon, children, defaultOpen = false }: {
  label: string; icon?: React.ReactNode; children?: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
        <span className="flex items-center gap-2">{icon}{label}</span>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {open && children && <div className="px-4 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

// ─── Main Editor ─────────────────────────────────────────────────────────────
export default function PlantillaEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const tpl = PLANTILLAS[id] ?? PLANTILLAS['1']

  const [nombre, setNombre]   = useState(tpl.nombre)
  const [tipo, setTipo]       = useState(tpl.tipo)
  const [activo, setActivo]   = useState(true)
  const [papel, setPapel]     = useState<'A4'|'A5'|'Carta'>('A4')
  const [margen, setMargen]   = useState({ arriba: '0.5', abajo: '0.5', izq: '0.6', der: '0.6' })
  const [headerHtml, setHeaderHtml] = useState(tpl.headerHtml)
  const [bodyHtml, setBodyHtml]     = useState(tpl.bodyHtml)
  const [footerHtml, setFooterHtml] = useState(tpl.footerHtml)
  const [zoom, setZoom]       = useState(100)
  const [saved, setSaved]     = useState(false)
  const [view, setView]       = useState<'single'|'double'>('single')
  const [openCampos, setOpenCampos] = useState<Set<string>>(new Set(['Comunes']))

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const paperW = papel === 'A5' ? 520 : papel === 'Carta' ? 680 : 794
  const scaledW = Math.round(paperW * zoom / 100)

  function insertToken(token: string) {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(token))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <button onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition shrink-0">
          <ArrowLeft size={16} />
        </button>
        <input value={nombre} onChange={e => setNombre(e.target.value)}
          className="flex-1 text-sm font-semibold text-gray-800 bg-transparent focus:outline-none focus:bg-gray-50 px-2 py-1 rounded-lg border border-transparent focus:border-gray-200"
          placeholder="Nombre de la plantilla" />
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-brand text-brand rounded-xl text-xs font-semibold hover:bg-brand/5 transition">
            <FileText size={12} /> Personalizar encabezado
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-brand text-brand rounded-xl text-xs font-semibold hover:bg-brand/5 transition">
            <FileText size={12} /> Personalizar pie de página
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button className="flex items-center gap-1.5 px-4 py-1.5 bg-brand/10 text-brand border border-brand/20 rounded-xl text-xs font-semibold hover:bg-brand/20 transition">
            <Eye size={12} /> Avance
          </button>
          <button onClick={save}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:opacity-90 transition">
            {saved ? <><Check size={13} /> Guardado</> : <><Save size={13} /> Guardar plantilla</>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel ──────────────────────────────────────────── */}
        <aside className="w-52 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
          <PropSection label="Propiedades de la plantilla" defaultOpen icon={<FileText size={13} className="text-brand" />}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Activo</span>
              <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)}
                className="w-4 h-4 rounded accent-brand" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 block mb-0.5">Nombre</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 block mb-0.5">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none">
                {['membretado','cotizacion','propuesta','contrato','orden','factura','garantia'].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 block mb-1">Tamaño del papel</label>
              <div className="flex gap-2">
                {(['A4','A5','Carta'] as const).map(p => (
                  <label key={p} className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="radio" name="papel" value={p} checked={papel === p} onChange={() => setPapel(p)}
                      className="accent-brand w-3 h-3" />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 block mb-1">Margen (pulgadas)</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Arriba', key: 'arriba' },
                  { label: 'Abajo',  key: 'abajo' },
                  { label: 'Izq.',   key: 'izq' },
                  { label: 'Der.',   key: 'der' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <p className="text-[9px] text-gray-400 mb-0.5">{label}</p>
                    <input type="number" step="0.1" min="0" max="2"
                      value={margen[key as keyof typeof margen]}
                      onChange={e => setMargen(m => ({ ...m, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30" />
                  </div>
                ))}
              </div>
            </div>
          </PropSection>

          <PropSection label="Antecedentes y estilo" icon={<span className="w-3 h-3 rounded-sm bg-gray-400 inline-block" />} />
          <PropSection label="Número de página" icon={<FileText size={11} className="text-gray-400" />} />
          <PropSection label="Elementos de línea" icon={<span className="text-gray-400">≡</span>} />
          <PropSection label="Encabezamiento" icon={<FileText size={11} className="text-gray-400" />} />
          <PropSection label="Pie de página" icon={<FileText size={11} className="text-gray-400" />} />

          {/* Campos / Tokens */}
          <div className="border-b border-gray-100">
            <button onClick={() => setOpenCampos(s => { const n = new Set(s); n.has('root') ? n.delete('root') : n.add('root'); return n })}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
              <span className="flex items-center gap-2"><span>{'{}'}</span> Campos</span>
              {openCampos.has('root') ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            {openCampos.has('root') && (
              <div className="pb-3">
                {CAMPO_GROUPS.map(g => (
                  <div key={g.label}>
                    <button onClick={() => setOpenCampos(s => { const n = new Set(s); n.has(g.label) ? n.delete(g.label) : n.add(g.label); return n })}
                      className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-bold text-gray-500 hover:bg-gray-50 transition uppercase tracking-wide">
                      {g.label}
                      {openCampos.has(g.label) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    </button>
                    {openCampos.has(g.label) && (
                      <div className="px-3 pb-1 space-y-0.5">
                        {g.tokens.map(t => (
                          <button key={t.token} onClick={() => insertToken(t.token)}
                            title={`Insertar ${t.desc}`}
                            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-brand/5 hover:text-brand transition group">
                            <p className="text-[10px] font-mono text-brand/80 group-hover:text-brand truncate">{t.token}</p>
                            <p className="text-[9px] text-gray-400">{t.desc}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Editor canvas ────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-gray-200 relative">
          <div className="flex justify-center pt-6 pb-12 px-4">
            {/* Paper */}
            <div
              className="bg-white shadow-lg"
              style={{
                width: scaledW,
                minHeight: Math.round(1123 * zoom / 100),
                fontFamily: 'Arial, sans-serif',
                fontSize: `${12 * zoom / 100}px`,
              }}>
              {/* Header zone */}
              <div className="border-b-2 border-gray-100">
                <EditorZone label="Contenido del encabezado" html={headerHtml} onChange={setHeaderHtml} zoom={zoom} />
              </div>
              {/* Body zone */}
              <div className="border-b-2 border-gray-100">
                <EditorZone label="" html={bodyHtml} onChange={setBodyHtml} zoom={zoom} />
              </div>
              {/* Footer zone */}
              <div>
                <EditorZone label="Contenido del pie de página" html={footerHtml} onChange={setFooterHtml} zoom={zoom} />
              </div>
            </div>
          </div>

          {/* ── Bottom zoom controls ─────────────────────────────── */}
          <div className="fixed bottom-4 right-4 flex items-center gap-1.5 bg-white rounded-2xl border border-gray-200 shadow-lg px-3 py-2">
            <button onClick={() => setZoom(z => Math.max(50, z - 10))}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition"><ZoomOut size={14} /></button>
            <span className="text-xs font-semibold text-gray-700 w-12 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 10))}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition"><ZoomIn size={14} /></button>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button onClick={() => setZoom(100)}
              className={cn('p-1 rounded-lg transition text-gray-500 hover:bg-gray-100')}>
              <Monitor size={14} />
            </button>
            <button onClick={() => setView(v => v === 'single' ? 'double' : 'single')}
              className={cn('p-1 rounded-lg transition', view === 'double' ? 'text-brand bg-brand/10' : 'text-gray-500 hover:bg-gray-100')}>
              <Columns2 size={14} />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <span className="text-xs text-gray-400">Pag. 1</span>
          </div>
        </div>
      </div>
    </div>
  )
}
