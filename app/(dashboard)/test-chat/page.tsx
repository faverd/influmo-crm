'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, RotateCcw, FlaskConical } from 'lucide-react'
import { formatTime } from '@/lib/utils'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  at: string
}

export default function TestChatPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg: Msg = { role: 'user', content: input, at: new Date().toISOString() }
    const newMsgs = [...msgs, userMsg]
    setMsgs(newMsgs)
    setInput('')
    setLoading(true)

    try {
      const r = await fetch('/api/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await r.json()
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: data.reply ?? data.error ?? 'Error al obtener respuesta',
        at: new Date().toISOString(),
      }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: '⚠️ Error de conexión', at: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 flex flex-col h-screen">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center">
            <FlaskConical size={18} className="text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Chat</h1>
            <p className="text-sm text-gray-500">Probá las respuestas de Berta sin enviar WhatsApp real</p>
          </div>
        </div>
        <button
          onClick={() => setMsgs([])}
          className="btn-outline"
        >
          <RotateCcw size={14} />
          Limpiar
        </button>
      </div>

      {/* Chat area */}
      <div className="card flex-1 flex flex-col overflow-hidden p-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">Berta (simulada)</p>
            <p className="text-xs text-green-500">Activa • usando system prompt actual</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {msgs.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Bot size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Enviá un mensaje para probar a Berta</p>
              <p className="text-xs mt-1 text-gray-300">Usa el system prompt configurado en /settings</p>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-brand text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                  {formatTime(m.at)}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-5 py-4 shrink-0">
          <form onSubmit={send} className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as any) }
              }}
              placeholder="Escribí como si fueras un cliente de WhatsApp..."
              rows={1}
              className="input flex-1 resize-none"
              style={{ minHeight: 40, maxHeight: 120 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn-primary h-10 px-4 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
