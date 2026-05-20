'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2 } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-lg">In</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Influmo CRM</h1>
          <p className="text-sm text-gray-500 mt-1">WhatsApp CRM con agente IA</p>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-green-500" />
              </div>
              <h2 className="font-semibold text-gray-900 mb-2">Revisá tu email</h2>
              <p className="text-sm text-gray-500">
                Te enviamos un magic link a <strong>{email}</strong>.
                Hacé clic en el link para acceder al CRM.
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-gray-900 mb-1">Iniciar sesión</h2>
              <p className="text-sm text-gray-500 mb-5">Te enviamos un link de acceso a tu email</p>

              {authError && (
                <div className="bg-red-50 text-red-600 text-sm rounded-[10px] px-4 py-3 mb-4">
                  Error de autenticación. Intentá de nuevo.
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input"
                    placeholder="vos@tudominio.com"
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary justify-center mt-1">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Enviar magic link
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Acceso restringido al equipo de Influmo
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
