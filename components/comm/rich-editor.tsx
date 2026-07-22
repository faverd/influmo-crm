'use client'

import { useRef, useState, useEffect } from 'react'
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link2, Image as ImageIcon,
  Paperclip, Palette, Highlighter, Eraser, PenLine, Loader2, Smile,
  MoreHorizontal, Table as TableIcon, Minus, Rows3, Columns3, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { alertDialog } from '@/lib/dialogs'

const EMOJIS = ['😀','😊','👍','🙏','✅','🎉','🌱','📌','📞','📧','💼','⭐','🔥','💡','📍','🚀','✨','❤️','👋','📅','⚠️','💰','🤝','📎']
const FONTS = ['Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Tahoma']
const SIZES = [
  { l: '10', v: '2' }, { l: '12', v: '3' }, { l: '14', v: '4' }, { l: '16', v: '5' }, { l: '20', v: '6' }, { l: '24', v: '7' },
]
const COLORS = ['#0f172a', '#ef4444', '#ea580c', '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#64748b', '#ffffff']

export function RichEditor({ value, onChange, signature, apiRef, minH }: {
  value: string; onChange: (html: string) => void; signature?: string
  apiRef?: { current: { insert: (html: string) => void } | null }
  minH?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const attachRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showColor, setShowColor] = useState<'fore' | 'back' | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const lastVal = useRef('')
  const savedRange = useRef<Range | null>(null)

  function saveSel() {
    const s = window.getSelection()
    if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) savedRange.current = s.getRangeAt(0).cloneRange()
  }
  function focusEditor() {
    const el = ref.current; if (!el) return
    el.focus()
    const sel = window.getSelection(); if (!sel) return
    if (savedRange.current && el.contains(savedRange.current.commonAncestorContainer)) {
      sel.removeAllRanges(); sel.addRange(savedRange.current)
    } else {
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false)
      sel.removeAllRanges(); sel.addRange(r)
    }
  }

  useEffect(() => {
    if (ref.current && value !== lastVal.current && value !== ref.current.innerHTML) {
      ref.current.innerHTML = value || ''
      lastVal.current = value || ''
    }
  }, [value])

  const emit = () => { const h = ref.current?.innerHTML ?? ''; lastVal.current = h; onChange(h) }
  const cmd = (c: string, v?: string) => { focusEditor(); document.execCommand(c, false, v); emit() }

  useEffect(() => { if (apiRef) apiRef.current = { insert: (h: string) => cmd('insertHTML', h) } })

  async function upload(file: File): Promise<{ url: string; name: string; type: string } | null> {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/comunicacion/upload', { method: 'POST', body: fd })
      return res.ok ? await res.json() : null
    } finally { setUploading(false) }
  }
  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const r = await upload(f); if (r) cmd('insertHTML', `<span class="re-img" style="display:inline-block;resize:both;overflow:hidden;max-width:100%;width:320px;border-radius:8px"><img src="${r.url}" style="width:100%;height:100%;display:block;object-fit:contain" /></span>&nbsp;`)
    if (fileRef.current) fileRef.current.value = ''
  }
  async function onAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const r = await upload(f); if (r) cmd('insertHTML', `<a href="${r.url}" target="_blank" style="color:#0d9488">📎 ${r.name}</a>&nbsp;`)
    if (attachRef.current) attachRef.current.value = ''
  }
  function addLink() { saveSel(); setLinkUrl(''); setShowLink(true) }
  function confirmLink() { if (linkUrl.trim()) cmd('createLink', linkUrl.trim()); setShowLink(false) }
  function insertSignature() { if (signature) cmd('insertHTML', `<br><br>${signature}`) }

  function insertTable(rows: number, cols: number) {
    const cell = '<td style="border:1px solid #ccc;padding:6px;min-width:40px">&nbsp;</td>'
    const tr = `<tr>${cell.repeat(cols)}</tr>`
    cmd('insertHTML', `<table style="border-collapse:collapse;width:100%;margin:8px 0">${tr.repeat(rows)}</table><p></p>`)
    setShowTable(false)
  }
  function curCell(): HTMLTableCellElement | null {
    let n = window.getSelection()?.anchorNode as Node | null
    while (n && n !== ref.current) { if (n.nodeName === 'TD' || n.nodeName === 'TH') return n as HTMLTableCellElement; n = n.parentNode }
    return null
  }
  async function tableOp(op: 'addRow' | 'delRow' | 'addCol' | 'delCol' | 'del') {
    const td = curCell(); if (!td) { await alertDialog('Coloca el cursor dentro de una tabla'); return }
    const tr = td.parentElement as HTMLTableRowElement; const table = td.closest('table'); if (!tr || !table) return
    const idx = Array.from(tr.children).indexOf(td)
    if (op === 'addRow') { const nr = tr.cloneNode(true) as HTMLTableRowElement; nr.querySelectorAll('td,th').forEach(c => (c.innerHTML = '&nbsp;')); tr.after(nr) }
    else if (op === 'delRow') { if (table.rows.length > 1) tr.remove() }
    else if (op === 'addCol') { Array.from(table.rows).forEach(r => { const c = document.createElement('td'); c.style.cssText = 'border:1px solid #ccc;padding:6px;min-width:40px'; c.innerHTML = '&nbsp;'; r.children[idx]?.after(c) }) }
    else if (op === 'delCol') { Array.from(table.rows).forEach(r => r.children[idx]?.remove()) }
    else if (op === 'del') { table.remove() }
    emit(); setShowTable(false)
  }

  const Btn = ({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) => (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClick} title={title}
      className={cn('w-7 h-7 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100', active && 'bg-gray-200')}>{children}</button>
  )

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/60">
        <Btn onClick={() => cmd('undo')} title="Deshacer"><Undo2 size={15} /></Btn>
        <Btn onClick={() => cmd('redo')} title="Rehacer"><Redo2 size={15} /></Btn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <select onMouseDown={e => e.stopPropagation()} onChange={e => cmd('fontName', e.target.value)} className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white" title="Tipo de letra" defaultValue="Arial">
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select onChange={e => cmd('fontSize', e.target.value)} className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white" title="Tamaño" defaultValue="3">
          {SIZES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={() => cmd('bold')} title="Negrita"><Bold size={15} /></Btn>
        <Btn onClick={() => cmd('italic')} title="Cursiva"><Italic size={15} /></Btn>
        <Btn onClick={() => cmd('underline')} title="Subrayado"><Underline size={15} /></Btn>
        <Btn onClick={() => cmd('strikeThrough')} title="Tachado"><Strikethrough size={15} /></Btn>
        <div className="relative">
          <Btn onClick={() => setShowColor(showColor === 'fore' ? null : 'fore')} title="Color de texto"><Palette size={15} /></Btn>
          {showColor === 'fore' && <ColorPop onPick={c => { cmd('foreColor', c); setShowColor(null) }} />}
        </div>
        <div className="relative">
          <Btn onClick={() => setShowColor(showColor === 'back' ? null : 'back')} title="Resaltar"><Highlighter size={15} /></Btn>
          {showColor === 'back' && <ColorPop onPick={c => { cmd('hiliteColor', c); setShowColor(null) }} />}
        </div>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={() => cmd('insertUnorderedList')} title="Viñetas"><List size={15} /></Btn>
        <Btn onClick={() => cmd('insertOrderedList')} title="Numeración"><ListOrdered size={15} /></Btn>
        <Btn onClick={() => cmd('justifyLeft')} title="Izquierda"><AlignLeft size={15} /></Btn>
        <Btn onClick={() => cmd('justifyCenter')} title="Centrar"><AlignCenter size={15} /></Btn>
        <Btn onClick={() => cmd('justifyRight')} title="Derecha"><AlignRight size={15} /></Btn>
        <Btn onClick={() => cmd('justifyFull')} title="Justificar"><AlignJustify size={15} /></Btn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={addLink} title="Enlace"><Link2 size={15} /></Btn>
        <Btn onClick={() => fileRef.current?.click()} title="Insertar imagen"><ImageIcon size={15} /></Btn>
        <Btn onClick={() => attachRef.current?.click()} title="Adjuntar archivo"><Paperclip size={15} /></Btn>
        <div className="relative">
          <Btn onClick={() => setShowEmoji(v => !v)} title="Emojis"><Smile size={15} /></Btn>
          {showEmoji && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowEmoji(false)} />
              <div className="absolute top-8 left-0 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 w-64">
                {EMOJIS.map(e => <button key={e} type="button" onMouseDown={ev => ev.preventDefault()} onClick={() => { cmd('insertHTML', e); setShowEmoji(false) }} className="w-6 h-6 hover:bg-gray-100 rounded text-base">{e}</button>)}
              </div>
            </>
          )}
        </div>
        {signature && <Btn onClick={insertSignature} title="Insertar firma"><PenLine size={15} /></Btn>}
        <Btn onClick={() => cmd('removeFormat')} title="Quitar formato"><Eraser size={15} /></Btn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={() => setShowMore(v => !v)} title="Más herramientas" active={showMore}><MoreHorizontal size={15} /></Btn>
        {uploading && <Loader2 size={14} className="animate-spin text-gray-400 ml-1" />}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />
        <input ref={attachRef} type="file" className="hidden" onChange={onAttach} />
      </div>
      {showMore && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/40">
          <div className="relative">
            <Btn onClick={() => setShowTable(v => !v)} title="Tabla" active={showTable}><TableIcon size={15} /></Btn>
            {showTable && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowTable(false)} />
                <div className="absolute top-8 left-0 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-44 text-sm">
                  <p className="text-[11px] text-gray-400 px-1 mb-1">Insertar tabla</p>
                  <div className="flex gap-1 px-1 mb-2">
                    {[[2, 2], [3, 2], [3, 3], [4, 3]].map(([r, c]) => <button key={`${r}x${c}`} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insertTable(r, c)} className="px-2 py-1 text-[11px] rounded bg-gray-50 border border-gray-100 hover:border-brand">{c}×{r}</button>)}
                  </div>
                  <div className="border-t border-gray-100 pt-1">
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp('addRow')} className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-[12px]"><Rows3 size={13} /> Agregar fila</button>
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp('addCol')} className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-[12px]"><Columns3 size={13} /> Agregar columna</button>
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp('delRow')} className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-[12px] text-gray-600">Eliminar fila</button>
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp('delCol')} className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-[12px] text-gray-600">Eliminar columna</button>
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp('del')} className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-red-50 rounded text-[12px] text-red-500"><Trash2 size={13} /> Eliminar tabla</button>
                  </div>
                </div>
              </>
            )}
          </div>
          <Btn onClick={() => cmd('insertHorizontalRule')} title="Línea horizontal"><Minus size={15} /></Btn>
          <Btn onClick={() => cmd('formatBlock', '<blockquote>')} title="Cita"><span className="text-base leading-none">❝</span></Btn>
          <Btn onClick={() => cmd('formatBlock', '<pre>')} title="Bloque de código">{'</>'}</Btn>
          <span className="w-px h-5 bg-gray-200 mx-1" />
          <Btn onClick={() => cmd('formatBlock', '<h1>')} title="Título 1"><span className="text-xs font-bold">H1</span></Btn>
          <Btn onClick={() => cmd('formatBlock', '<h2>')} title="Título 2"><span className="text-xs font-bold">H2</span></Btn>
          <Btn onClick={() => cmd('formatBlock', '<p>')} title="Párrafo normal"><span className="text-xs">¶</span></Btn>
        </div>
      )}
      <div ref={ref} contentEditable onInput={emit} onKeyUp={saveSel} onMouseUp={saveSel} onBlur={saveSel}
        className="flex-1 overflow-y-auto p-3 text-sm text-gray-800 focus:outline-none leading-relaxed bg-white"
        style={{ fontFamily: 'Arial', minHeight: minH ?? 160 }} suppressContentEditableWarning />

      {showLink && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-3" onClick={() => setShowLink(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-4">
            <p className="text-base font-semibold text-gray-900 mb-3">Insertar enlace</p>
            <label className="text-[12px] font-medium text-gray-600 block mb-1">URL del enlace</label>
            <input autoFocus value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') confirmLink() }} placeholder="https://…" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowLink(false)} className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmLink} className="px-4 py-2 bg-brand text-white rounded-lg text-[13px] font-semibold hover:bg-brand/90">Insertar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ColorPop({ onPick }: { onPick: (c: string) => void }) {
  return (
    <div className="absolute top-8 left-0 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 w-40">
      {COLORS.map(c => (
        <button key={c} type="button" onMouseDown={e => e.preventDefault()} onClick={() => onPick(c)}
          className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition" style={{ backgroundColor: c }} />
      ))}
    </div>
  )
}
