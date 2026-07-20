'use client'
import { useState } from 'react'
import { Inbox, Mail, MailOpen, Star, Trash2, Search, RefreshCw } from 'lucide-react'

const MENSAJES_DEMO = [
  { id: '1', de: 'María García', email: 'maria@ejemplo.com', asunto: 'Consulta sobre cortinas para sala', mensaje: 'Buenos días, me gustaría saber el costo de cortinas blackout para una sala de 5x4 metros. ¿Tienen muestras disponibles?', fecha: '2026-07-19 09:30', leido: false, estrella: false },
  { id: '2', de: 'Carlos López', email: 'carlos@empresa.com', asunto: 'Presupuesto proyecto oficina', mensaje: 'Necesito un presupuesto para decorar 3 oficinas ejecutivas. Área aproximada 25m² cada una. Incluir mobiliario y cortinas.', fecha: '2026-07-19 08:15', leido: false, estrella: true },
  { id: '3', de: 'Ana Torres', email: 'ana.torres@gmail.com', asunto: 'Seguimiento de mi pedido', mensaje: 'Hola, quería saber el estado de mi pedido de persianas venecianas que hicimos la semana pasada.', fecha: '2026-07-18 16:45', leido: true, estrella: false },
  { id: '4', de: 'Decoraciones Lima SAC', email: 'ventas@decorlima.pe', asunto: 'Propuesta de colaboración', mensaje: 'Estimados, somos una empresa de acabados y nos gustaría explorar una posible alianza comercial.', fecha: '2026-07-18 14:20', leido: true, estrella: false },
  { id: '5', de: 'Jorge Ramírez', email: 'j.ramirez@hotmail.com', asunto: 'Corrección de medidas', mensaje: 'Las medidas que envié anteriormente estaban incorrectas. Las correctas son: ventana principal 2.80m ancho x 2.20m alto.', fecha: '2026-07-17 11:00', leido: true, estrella: true },
]

export default function BandejaPage() {
  const [mensajes, setMensajes] = useState(MENSAJES_DEMO)
  const [selected, setSelected] = useState<typeof MENSAJES_DEMO[0] | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'no_leidos' | 'estrella'>('todos')

  function toggleLeido(id: string) {
    setMensajes(m => m.map(x => x.id === id ? { ...x, leido: !x.leido } : x))
  }
  function toggleEstrella(id: string) {
    setMensajes(m => m.map(x => x.id === id ? { ...x, estrella: !x.estrella } : x))
  }
  function eliminar(id: string) {
    setMensajes(m => m.filter(x => x.id !== id))
    if (selected?.id === id) setSelected(null)
  }
  function abrir(msg: typeof MENSAJES_DEMO[0]) {
    setSelected(msg)
    if (!msg.leido) toggleLeido(msg.id)
  }

  const filtrados = mensajes.filter(m => {
    if (filter === 'no_leidos' && m.leido) return false
    if (filter === 'estrella' && !m.estrella) return false
    return m.de.toLowerCase().includes(search.toLowerCase()) || m.asunto.toLowerCase().includes(search.toLowerCase())
  })

  const noLeidos = mensajes.filter(m => !m.leido).length

  return (
    <div className="p-6 max-w-7xl mx-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bandeja de Entrada</h1>
          <p className="text-sm text-gray-500 mt-0.5">{noLeidos} mensajes sin leer</p>
        </div>
        <button className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex" style={{ minHeight: '500px' }}>
        {/* Lista */}
        <div className="w-full md:w-80 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none" />
            </div>
            <div className="flex gap-1">
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'no_leidos', label: `Sin leer (${noLeidos})` },
                { key: 'estrella', label: '⭐' },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
                  className={`flex-1 py-1 text-xs rounded-lg transition ${filter === f.key ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox size={30} className="mx-auto text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">Sin mensajes</p>
              </div>
            ) : filtrados.map(m => (
              <button key={m.id} onClick={() => abrir(m)}
                className={`w-full text-left p-3 hover:bg-gray-50 transition ${selected?.id === m.id ? 'bg-brand/5 border-l-2 border-brand' : ''} ${!m.leido ? 'bg-blue-50/50' : ''}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-medium truncate ${!m.leido ? 'text-gray-900' : 'text-gray-600'}`}>{m.de}</span>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-1">{m.fecha.split(' ')[1]}</span>
                </div>
                <p className={`text-xs truncate mb-0.5 ${!m.leido ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{m.asunto}</p>
                <p className="text-[10px] text-gray-400 truncate">{m.mensaje}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detalle */}
        <div className="flex-1 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">Selecciona un mensaje</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900 text-base">{selected.asunto}</h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{selected.de}</span>
                      <span>&lt;{selected.email}&gt;</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{selected.fecha}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleEstrella(selected.id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                      <Star size={16} className={selected.estrella ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                    </button>
                    <button onClick={() => eliminar(selected.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6">
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selected.mensaje}</p>
              </div>
              <div className="p-4 border-t border-gray-100">
                <textarea placeholder="Escribe tu respuesta..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none mb-2" />
                <div className="flex justify-end">
                  <button className="px-5 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90">
                    Responder
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
