'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [mode, setMode] = useState<'password' | 'reset'>('password')
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback`,
    })
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
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
          {resetSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-green-500" />
              </div>
              <h2 className="font-semibold text-gray-900 mb-2">Revisá tu email</h2>
              <p className="text-sm text-gray-500 mb-4">
                Te enviamos un link para restablecer tu contraseña a <strong>{email}</strong>.
              </p>
              <button
                onClick={() => { setResetSent(false); setMode('password') }}
                className="text-sm text-brand font-medium hover:underline"
              >
                Volver al login
              </button>
            </div>
          ) : mode === 'reset' ? (
            <>
              <h2 className="font-semibold text-gray-900 mb-1">Restablecer contraseña</h2>
              <p className="text-sm text-gray-500 mb-5">Te enviamos un link a tu email</p>

              {authError && (
                <div className="bg-red-50 text-red-600 text-sm rounded-[10px] px-4 py-3 mb-4">
                  Error de autenticación. Intentá de nuevo.
                </div>
              )}

              <form onSubmit={handleReset} className="flex flex-col gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input pl-9"
                      placeholder="vos@tudominio.com"
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary justify-center mt-1">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Enviar link de recuperación
                </button>
              </form>

              <button
                onClick={() => setMode('password')}
                className="text-sm text-gray-400 hover:text-gray-600 mt-4 block text-center w-full"
              >
                ← Volver al login
              </button>
            </>
          ) : (
            <>
              <h2 className="font-semibold text-gray-900 mb-1">Iniciar sesión</h2>
              <p className="text-sm text-gray-500 mb-5">Ingresá con tu email y contraseña</p>

              {authError && (
                <div className="bg-red-50 text-red-600 text-sm rounded-[10px] px-4 py-3 mb-4">
                  Error de autenticación. Intentá de nuevo.
                </div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input pl-9"
                      placeholder="vos@tudominio.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Contraseña</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input pl-9 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary justify-center mt-1">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Ingresar
                </button>
              </form>

              <button
                onClick={() => setMode('reset')}
                className="text-sm text-brand hover:underline mt-4 block text-center w-full"
              >
                Olvidé mi contraseña
              </button>
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
