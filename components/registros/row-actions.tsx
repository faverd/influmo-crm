'use client'

import { useState } from 'react'
import { Eye, Share2, Mail, Printer, Pencil, Trash2, X } from 'lucide-react'
import { composeEmail } from '@/lib/mail-compose'

export interface RecordView {
  title: string
  subtitle?: string
  email?: string
  phone?: string
  fields: { label: string; value: string | number | null | undefined }[]
}

function asText(v: RecordView): string {
  return `*${v.title}*\n` + v.fields.filter(f => f.value != null && f.value !== '').map(f => `${f.label}: ${f.value}`).join('\n')
}

function printRecord(v: RecordView) {
  const rows = v.fields.filter(f => f.value != null && f.value !== '')
    .map(f => `<tr><td style="padding:6px 12px;color:#64748b;font-weight:600;border-bottom:1px solid #f1f5f9">${f.label}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${f.value}</td></tr>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${v.title}</title>
    <style>body{font-family:system-ui,Segoe UI,Arial;color:#0f172a;padding:32px;max-width:680px;margin:auto}
    h1{font-size:20px;margin:0 0 2px} .sub{color:#64748b;margin:0 0 18px;font-size:13px}
    table{width:100%;border-collapse:collapse;font-size:13px}</style></head>
    <body><h1>${v.title}</h1>${v.subtitle ? `<p class="sub">${v.subtitle}</p>` : ''}
    <table>${rows}</table>
    <p style="margin-top:24px;color:#94a3b8;font-size:11px">Generado por el CRM — ${new Date().toLocaleString('es-PE')}</p>
    <script>window.onload=()=>{window.print()}</script></body></html>`
  const w = window.open('', '_blank', 'width=720,height=800')
  if (w) { w.document.write(html); w.document.close() }
}

const iconBtn = 'p-1 text-gray-400 transition-colors'

export function RowActions<T extends { id: string }>({ record, describe, onEdit, onDelete, canWrite, hideShare, hideMail }: {
  record: T
  describe: (r: T) => RecordView
  onEdit: (r: T) => void
  onDelete: (id: string) => void
  canWrite: boolean
  hideShare?: boolean
  hideMail?: boolean
}) {
  const [view, setView] = useState(false)
  const v = describe(record)
  const text = asText(v)
  const share = () => { const ph = (v.phone || '').replace(/\D/g, ''); window.open(ph ? `https://wa.me/51${ph.replace(/^51/, '')}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank') }
  const mail = () => composeEmail({ to: v.email ?? '', subject: v.title, body: text })

  return (
    <>
      <div className="inline-flex items-center gap-0.5 whitespace-nowrap">
        <button onClick={() => setView(true)} title="Ver" className={`${iconBtn} hover:text-blue-500`}><Eye size={14} /></button>
        {!hideShare && <button onClick={share} title="Compartir por WhatsApp" className={`${iconBtn} hover:text-green-600`}><Share2 size={14} /></button>}
        {!hideMail && <button onClick={mail} title="Enviar por correo" className={`${iconBtn} hover:text-amber-600`}><Mail size={14} /></button>}
        <button onClick={() => printRecord(v)} title="Imprimir" className={`${iconBtn} hover:text-gray-700`}><Printer size={14} /></button>
        <button onClick={() => onEdit(record)} title="Editar" className={`${iconBtn} hover:text-brand`}><Pencil size={14} /></button>
        {canWrite && <button onClick={() => onDelete(record.id)} title="Eliminar" className={`${iconBtn} hover:text-red-500`}><Trash2 size={14} /></button>}
      </div>

      {view && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3" onClick={() => setView(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
              <div><h2 className="font-semibold text-gray-900">{v.title}</h2>{v.subtitle && <p className="text-xs text-gray-400">{v.subtitle}</p>}</div>
              <button onClick={() => setView(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-3">
              <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden table-fixed">
                <thead>
                  <tr className="bg-brand/10 text-brand">
                    <th className="w-1/3 px-2.5 py-1.5 font-semibold border-b border-r border-gray-200">Campo</th>
                    <th className="px-2.5 py-1.5 font-semibold border-b border-gray-200">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {v.fields.filter(f => f.value != null && f.value !== '').map((f, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                      <td className="px-2.5 py-1.5 align-top text-gray-500 font-medium border-r border-gray-100 break-words">{f.label}</td>
                      <td className="px-2.5 py-1.5 align-top text-gray-800 break-words whitespace-pre-wrap">{f.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100">
              <button onClick={share} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><Share2 size={14} /> WhatsApp</button>
              <button onClick={mail} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><Mail size={14} /> Correo</button>
              <button onClick={() => { onEdit(record); setView(false) }} className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90"><Pencil size={14} /> Editar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
