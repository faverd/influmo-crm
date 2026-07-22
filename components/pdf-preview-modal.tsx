'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, ZoomIn, ZoomOut, Share2, Mail, Printer, Download, ExternalLink, X, Loader2 } from 'lucide-react'
import type { jsPDF } from 'jspdf'
import { alertDialog } from '@/lib/dialogs'

interface PdfPreviewModalProps {
  title: string
  filename: string
  buildDoc: () => Promise<jsPDF>
  emailTo?: string
  emailSubject?: string
  onClose: () => void
}

export default function PdfPreviewModal({ title, filename, buildDoc, emailTo, emailSubject, onClose }: PdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(100)
  const docRef = useRef<jsPDF | null>(null)

  useEffect(() => {
    let revoke: string | null = null
    buildDoc().then(doc => {
      docRef.current = doc
      const url = doc.output('bloburl').toString()
      revoke = url
      setBlobUrl(url)
      setLoading(false)
    })
    return () => { if (revoke) URL.revokeObjectURL(revoke) }
  }, [buildDoc])

  function getBlob(): Blob | null {
    return docRef.current ? docRef.current.output('blob') : null
  }

  function handleDescargar() {
    const blob = getBlob(); if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  function handleAbrirPdf() {
    if (blobUrl) window.open(blobUrl, '_blank')
  }

  function handleImprimir() {
    if (!blobUrl) return
    const win = window.open(blobUrl, '_blank')
    win?.addEventListener('load', () => win.print())
  }

  async function handleCompartir() {
    const blob = getBlob(); if (!blob) return
    const file = new File([blob], filename.endsWith('.pdf') ? filename : `${filename}.pdf`, { type: 'application/pdf' })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title }) } catch { /* user cancelled */ }
    } else {
      handleDescargar()
      await alertDialog('Tu navegador no soporta compartir archivos directamente. Se descargó el PDF para que lo compartas manualmente.')
    }
  }

  function handleCorreo() {
    handleDescargar()
    const subject = encodeURIComponent(emailSubject || title)
    const body = encodeURIComponent('Adjunto encontrarás el documento. (El PDF se descargó automáticamente — adjúntalo a este correo antes de enviarlo.)')
    window.location.href = `mailto:${emailTo || ''}?subject=${subject}&body=${body}`
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '92vh' }}>
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-3 px-3 sm:px-5 py-2.5 border-b border-gray-100 bg-gray-50/60 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-brand shrink-0" />
            <span className="text-sm font-semibold text-gray-800 truncate">{title}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"><ZoomOut size={14} /></button>
            <span className="text-xs text-gray-500 w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"><ZoomIn size={14} /></button>
          </div>
          <div className="w-px h-5 bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-1 flex-1 justify-end flex-wrap">
            <button onClick={handleCompartir} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition"><Share2 size={13} /> <span className="hidden sm:inline">Compartir</span></button>
            <button onClick={handleCorreo} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition"><Mail size={13} /> <span className="hidden sm:inline">Correo</span></button>
            <button onClick={handleImprimir} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition"><Printer size={13} /> <span className="hidden sm:inline">Imprimir</span></button>
            <button onClick={handleDescargar} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition"><Download size={13} /> <span className="hidden sm:inline">Descargar</span></button>
            <button onClick={handleAbrirPdf} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand hover:bg-brand/10 transition"><ExternalLink size={13} /> <span className="hidden sm:inline">Abrir PDF</span></button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition ml-1"><X size={16} /></button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto bg-gray-200 flex items-start justify-center p-4">
          {loading || !blobUrl ? (
            <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
          ) : (
            <iframe src={blobUrl} title={title}
              style={{ width: `${(794 * zoom) / 100}px`, height: `${(1123 * zoom) / 100}px`, border: 0, background: 'white' }}
              className="shadow-lg" />
          )}
        </div>
      </div>
    </div>
  )
}
