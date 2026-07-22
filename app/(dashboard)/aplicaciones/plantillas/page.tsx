'use client'
import { useState } from 'react'
import { Plus, FileText, Copy, Edit2, Tag } from 'lucide-react'
import Link from 'next/link'

const PLANTILLAS_DEFAULT = [
  { id: '1', nombre: 'Cotización de Cortinas', tipo: 'cotizacion', descripcion: 'Plantilla estándar para cotizar instalación de cortinas y persianas', variables: ['cliente','fecha','total','proyecto'] },
  { id: '2', nombre: 'Propuesta de Decoración Integral', tipo: 'propuesta', descripcion: 'Propuesta completa para proyectos de decoración de interiores', variables: ['cliente','direccion','presupuesto','fecha_entrega'] },
  { id: '3', nombre: 'Contrato de Servicios', tipo: 'contrato', descripcion: 'Contrato estándar para prestación de servicios de decoración', variables: ['cliente','ruc','monto','plazo','garantia'] },
  { id: '4', nombre: 'Orden de Trabajo', tipo: 'orden', descripcion: 'Orden de trabajo para instaladores y técnicos', variables: ['tecnico','direccion','fecha','materiales'] },
  { id: '5', nombre: 'Factura de Servicio', tipo: 'factura', descripcion: 'Plantilla de factura para servicios de decoración', variables: ['cliente','ruc','items','igv','total'] },
  { id: '6', nombre: 'Garantía de Producto', tipo: 'garantia', descripcion: 'Certificado de garantía para productos instalados', variables: ['cliente','producto','fecha_instalacion','plazo_garantia'] },
]

const TIPO_COLORS: Record<string, string> = {
  cotizacion: 'bg-blue-100 text-blue-700',
  propuesta: 'bg-purple-100 text-purple-700',
  contrato: 'bg-green-100 text-green-700',
  orden: 'bg-orange-100 text-orange-700',
  factura: 'bg-teal-100 text-teal-700',
  garantia: 'bg-pink-100 text-pink-700',
}

export default function PlantillasPage() {
  const [filter, setFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', tipo: 'cotizacion', descripcion: '', contenido: '' })

  const filtered = PLANTILLAS_DEFAULT.filter(p =>
    p.nombre.toLowerCase().includes(filter.toLowerCase()) ||
    p.tipo.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Plantillas</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Documentos y formatos para tu negocio</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-brand text-white px-2.5 sm:px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> <span className="hidden sm:inline">Nueva Plantilla</span>
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'cotizacion', 'propuesta', 'contrato', 'orden', 'factura', 'garantia'].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === t ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === '' ? 'Todas' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={20} className="text-brand" />
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${TIPO_COLORS[p.tipo] ?? 'bg-gray-100 text-gray-600'}`}>{p.tipo}</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{p.nombre}</h3>
            <p className="text-xs text-gray-400 mb-3">{p.descripcion}</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {p.variables.map(v => (
                <span key={v} className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1">
                  <Tag size={9} />{`{${v}}`}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition">
                <Copy size={12} /> Usar
              </button>
              <Link href={`/aplicaciones/plantillas/${p.id}`}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition">
                <Edit2 size={12} /> Editar
              </Link>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between">
              <h2 className="text-lg font-bold">Nueva Plantilla</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Nombre de la plantilla"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {['cotizacion','propuesta','contrato','orden','factura','garantia','otro'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Descripción</label>
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Contenido</label>
                <textarea value={form.contenido} onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))} rows={6}
                  placeholder="Escribe el contenido de la plantilla. Usa {variable} para campos dinámicos..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none font-mono" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={() => setModal(false)} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90">
                Guardar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
