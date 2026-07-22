'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, HelpCircle, Info } from 'lucide-react'
import { registerDialogListener, type DialogRequest } from '@/lib/dialogs'
import { cn } from '@/lib/utils'

// Mounted once in the root layout — see <DialogHost/> in app/layout.tsx.
// Renders a single centered, in-app modal for whichever alert/confirm/prompt
// is currently active, replacing native window.* dialogs everywhere.
export default function DialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>([])
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const current = queue[0]

  useEffect(() => {
    registerDialogListener(req => setQueue(q => [...q, req]))
    return () => registerDialogListener(null)
  }, [])

  useEffect(() => {
    if (current?.kind === 'prompt') {
      setDraft(current.defaultValue)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [current])

  function pop() { setQueue(q => q.slice(1)) }

  function handleConfirm(value: boolean) {
    if (current?.kind === 'confirm') current.resolve(value)
    pop()
  }
  function handlePromptSubmit() {
    if (current?.kind === 'prompt') current.resolve(draft.trim() === '' ? null : draft)
    pop()
  }
  function handlePromptCancel() {
    if (current?.kind === 'prompt') current.resolve(null)
    pop()
  }
  function handleAlertOk() {
    if (current?.kind === 'alert') current.resolve()
    pop()
  }

  if (!current) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      onKeyDown={e => {
        if (e.key === 'Escape') {
          if (current.kind === 'confirm') handleConfirm(false)
          else if (current.kind === 'prompt') handlePromptCancel()
          else handleAlertOk()
        }
      }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5" role="dialog" aria-modal="true">
        {current.kind === 'confirm' && (
          <>
            <div className="flex items-start gap-3 mb-4">
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                current.danger ? 'bg-red-50 text-red-500' : 'bg-brand/10 text-brand')}>
                {current.danger ? <AlertTriangle size={17} /> : <HelpCircle size={17} />}
              </div>
              <div className="min-w-0 pt-1">
                {current.title && <p className="font-semibold text-gray-900 mb-0.5">{current.title}</p>}
                <p className="text-sm text-gray-600">{current.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => handleConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition">
                {current.cancelLabel ?? 'Cancelar'}
              </button>
              <button onClick={() => handleConfirm(true)} autoFocus
                className={cn('px-4 py-2 text-sm font-semibold text-white rounded-xl transition hover:opacity-90',
                  current.danger ? 'bg-red-500' : 'bg-brand')}>
                {current.confirmLabel ?? 'Aceptar'}
              </button>
            </div>
          </>
        )}

        {current.kind === 'prompt' && (
          <>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <HelpCircle size={17} />
              </div>
              <p className="text-sm text-gray-700 pt-1.5">{current.message}</p>
            </div>
            <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
              placeholder={current.placeholder}
              onKeyDown={e => { if (e.key === 'Enter') handlePromptSubmit() }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand/20" />
            <div className="flex justify-end gap-2">
              <button onClick={handlePromptCancel}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handlePromptSubmit}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-xl hover:opacity-90 transition">
                {current.confirmLabel ?? 'Aceptar'}
              </button>
            </div>
          </>
        )}

        {current.kind === 'alert' && (
          <>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <Info size={17} />
              </div>
              <div className="min-w-0 pt-1">
                {current.title && <p className="font-semibold text-gray-900 mb-0.5">{current.title}</p>}
                <p className="text-sm text-gray-600">{current.message}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleAlertOk} autoFocus
                className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-xl hover:opacity-90 transition">
                {current.okLabel ?? 'Entendido'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
