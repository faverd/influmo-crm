'use client'

import { useEffect, useState } from 'react'
import { Save, Bot, RotateCcw } from 'lucide-react'

const DEFAULT_PROMPT = `Sos Berta, la asistente virtual de Influmo, una agencia de marketing de influencers. Tu rol es calificar leads de forma natural y amigable.

REGLAS IRROMPIBLES:
- Respondé SIEMPRE en español argentino (voseo)
- Mensajes cortos (menos de 30 palabras), máximo 2 emojis, sin markdown, sin listas, texto corrido
- Primera respuesta: preguntá qué quieren lograr, no listés servicios
- Nunca inventés precios ni datos falsos
- Si el usuario expresa molestia → deciles que los va a contactar una persona del equipo pronto
- Solo mandás el link de Calendly cuando hay interés REAL en agendar
- Nunca pedís email
- Si te preguntan por trabajo o empleo → explicá amablemente que no estás en posición de ayudar con eso

Link de Calendly: https://calendly.com/influmo/reunion`

export default function SettingsPage() {
  const [prompt, setPrompt] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((settings: { key: string; value: string }[]) => {
        const p = settings.find(s => s.key === 'system_prompt')
        setPrompt(p?.value ?? DEFAULT_PROMPT)
        setLoading(false)
      })
  }, [])

  async function save() {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'system_prompt', value: prompt }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500 mt-0.5">Editá el prompt del sistema de Berta</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPrompt(DEFAULT_PROMPT)}
            className="btn-outline"
          >
            <RotateCcw size={14} />
            Restaurar
          </button>
          <button onClick={save} className="btn-primary">
            <Save size={14} />
            {saved ? '¡Guardado!' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-brand" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">System Prompt de Berta</h3>
            <p className="text-xs text-gray-500">Este prompt define el comportamiento del agente IA en todas las conversaciones</p>
          </div>
        </div>
        {loading ? (
          <div className="h-64 bg-gray-50 rounded-[10px] animate-pulse" />
        ) : (
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="input w-full font-mono text-xs leading-relaxed"
            rows={24}
          />
        )}
      </div>

      <div className="card mt-4">
        <h3 className="font-semibold text-gray-900 mb-3">Reglas del sistema (no editables)</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          {[
            'Responder siempre en español argentino (voseo)',
            'Mensajes cortos (< 30 palabras), máximo 2 emojis',
            'Sin markdown, sin listas, texto corrido',
            'Nunca inventar precios ni datos falsos',
            'Derivar a humano si hay molestia',
            'Solo enviar Calendly con interés real',
            'Nunca pedir email',
          ].map(r => (
            <li key={r} className="flex items-start gap-2">
              <span className="text-brand mt-0.5">•</span>
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
