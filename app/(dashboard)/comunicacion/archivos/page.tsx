'use client'
import { FileText, Image, Download, Trash2, Upload, Search } from 'lucide-react'
import { useState } from 'react'

const ARCHIVOS_DEMO = [
  { id: '1', nombre: 'Presupuesto_Cortinas_Garcia.pdf', tipo: 'pdf',   tamaño: '245 KB', fecha: '19-jul-2026' },
  { id: '2', nombre: 'Propuesta_Oficinas_Lopez.docx',  tipo: 'doc',   tamaño: '128 KB', fecha: '18-jul-2026' },
  { id: '3', nombre: 'Muestra_Tela_Blackout.jpg',      tipo: 'image', tamaño: '1.2 MB', fecha: '17-jul-2026' },
  { id: '4', nombre: 'Catalogo_Persianas_2026.pdf',    tipo: 'pdf',   tamaño: '3.4 MB', fecha: '15-jul-2026' },
]

export default function ComunicacionArchivosPage() {
  const [search, setSearch] = useState('')
  const filtered = ARCHIVOS_DEMO.filter(a => a.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Archivos adjuntos</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Archivos recibidos y enviados por correo</p>
        </div>
        <button className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Upload size={15} /> <span className="hidden sm:inline">Subir archivo</span>
        </button>
      </div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar archivo..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {filtered.map(a => (
          <div key={a.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.tipo === 'image' ? 'bg-pink-50' : 'bg-blue-50'}`}>
              {a.tipo === 'image' ? <Image size={18} className="text-pink-500" /> : <FileText size={18} className="text-blue-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{a.nombre}</p>
              <p className="text-xs text-gray-400">{a.tamaño} · {a.fecha}</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"><Download size={14} /></button>
              <button className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
