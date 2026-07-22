'use client'
import { useState } from 'react'
import { Plus, Truck, Phone, Mail, Globe, Star } from 'lucide-react'

const PROVEEDORES_DEMO = [
  { id: '1', nombre: 'Alrex Perú', categoria: 'cortinas', contacto: 'Juan Pérez', telefono: '987654321', email: 'ventas@alrex.pe', web: 'alrex.pe', calificacion: 5, notas: 'Proveedor principal de aluminio' },
  { id: '2', nombre: 'Aroni Textiles', categoria: 'telas', contacto: 'María García', telefono: '912345678', email: 'info@aroni.com', web: 'aroni.com', calificacion: 4, notas: 'Telas importadas' },
]

export default function ProveedoresPage() {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', categoria: 'telas', contacto: '', telefono: '', email: '', web: '', notas: '' })

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Directorio de proveedores de materiales</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> <span className="hidden sm:inline">Nuevo Proveedor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVEEDORES_DEMO.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900">{p.nombre}</h3>
                <span className="text-xs text-gray-400 capitalize">{p.categoria}</span>
              </div>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={12} className={i < p.calificacion ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                ))}
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              {p.contacto && <p className="text-gray-600 font-medium">{p.contacto}</p>}
              {p.telefono && <p className="flex items-center gap-2 text-gray-500"><Phone size={13} />{p.telefono}</p>}
              {p.email && <p className="flex items-center gap-2 text-gray-500"><Mail size={13} />{p.email}</p>}
              {p.web && <p className="flex items-center gap-2 text-blue-500"><Globe size={13} />{p.web}</p>}
            </div>
            {p.notas && <p className="mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">{p.notas}</p>}
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between">
              <h2 className="text-lg font-bold">Nuevo Proveedor</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'nombre', label: 'Nombre *', placeholder: 'Nombre del proveedor' },
                { key: 'contacto', label: 'Contacto', placeholder: 'Nombre de contacto' },
                { key: 'telefono', label: 'Teléfono', placeholder: '987654321' },
                { key: 'email', label: 'Email', placeholder: 'ventas@proveedor.com' },
                { key: 'web', label: 'Web', placeholder: 'www.proveedor.com' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
                  <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Categoría</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  {['telas','cortinas','persianas','pintura','muebles','accesorios','iluminacion','pisos','otros'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={() => setModal(false)} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
