'use client'
import { FileText, Image as ImageIcon, Download, Trash2, Upload, Search, Loader2, FolderOpen } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { alertDialog, confirmDialog } from '@/lib/dialogs'

type Archivo = { id: string; nombre: string; mime: string | null; size: number; url: string | null; direccion: string; created_at: string }

function fmtSize(n: number) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}
const isImg = (a: Archivo) => (a.mime || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(a.nombre)

export default function ComunicacionArchivosPage() {
  const [list, setList] = useState<Archivo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/comunicacion/archivos')
    if (r.ok) setList(await r.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch('/api/comunicacion/archivos', { method: 'POST', body: fd })
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    if (r.ok) load()
    else { const d = await r.json().catch(() => ({})); await alertDialog(d.error || 'No se pudo subir el archivo') }
  }

  async function remove(a: Archivo) {
    if (!await confirmDialog(`¿Eliminar ${a.nombre}?`, { danger: true, confirmLabel: 'Eliminar' })) return
    setList(l => l.filter(x => x.id !== a.id))
    await fetch(`/api/comunicacion/archivos?id=${a.id}`, { method: 'DELETE' })
  }

  const filtered = list.filter(a => a.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Archivos adjuntos</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Archivos recibidos y enviados por correo</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} <span className="hidden sm:inline">Subir archivo</span>
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
      </div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar archivo..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <FolderOpen size={34} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">{list.length === 0 ? 'Aún no hay archivos. Se agregan solos con los adjuntos del correo, o sube uno manualmente.' : 'Sin resultados'}</p>
          </div>
        ) : filtered.map(a => (
          <div key={a.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isImg(a) ? 'bg-pink-50' : 'bg-blue-50'}`}>
              {isImg(a) ? <ImageIcon size={18} className="text-pink-500" /> : <FileText size={18} className="text-blue-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{a.nombre}</p>
              <p className="text-xs text-gray-400">{fmtSize(a.size)} · {fmtFecha(a.created_at)} · {a.direccion === 'entrante' ? 'Recibido' : 'Enviado'}</p>
            </div>
            <div className="flex items-center gap-1">
              {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" download className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"><Download size={14} /></a>}
              <button onClick={() => remove(a)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
