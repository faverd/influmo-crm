'use client'
import { useState } from 'react'
import { Search, Plus, Phone, Mail, User } from 'lucide-react'

const CONTACTOS_DEMO = [
  { id: '1', nombre: 'María García',     email: 'maria@gmail.com',       telefono: '+51 999 111 222', empresa: 'Cliente particular' },
  { id: '2', nombre: 'Carlos López',     email: 'carlos@empresa.com',    telefono: '+51 999 333 444', empresa: 'Empresa López SAC' },
  { id: '3', nombre: 'Ana Torres',       email: 'ana@hotmail.com',       telefono: '+51 999 555 666', empresa: 'Cliente particular' },
  { id: '4', nombre: 'Lucía Fernández',  email: 'lucia.fernandez@gmail.com', telefono: '+51 999 777 888', empresa: 'Cliente particular' },
  { id: '5', nombre: 'Estudio Nova',     email: 'proyectos@estudionova.pe',  telefono: '+51 1 234 5678',  empresa: 'Estudio Nova Arquitectura' },
]

export default function ComunicacionContactosPage() {
  const [search, setSearch] = useState('')
  const filtered = CONTACTOS_DEMO.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Contactos de Comunicación</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Directorio de contactos de correo</p>
        </div>
        <button className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={15} /> <span className="hidden sm:inline">Nuevo contacto</span>
        </button>
      </div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contacto..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {filtered.map(c => (
          <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-brand">{c.nombre.slice(0,2).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{c.nombre}</p>
              <p className="text-xs text-gray-400">{c.empresa}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Mail size={11} />{c.email}</span>
              <span className="flex items-center gap-1"><Phone size={11} />{c.telefono}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
