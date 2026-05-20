'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react'

function LoginForm() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error, data } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else if (data.session) {
      router.push('/dashboard')
    } else {
      setSuccess('Cuenta creada. Revisá tu email para confirmarla, o pedile al admin que desactive la verificación en Supabase.')
    }
    setLoading(false)
  }

  async function handleForgot() {
    if (!email) { setError('Ingresá tu email primero'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback`,
    })
    setSuccess('Si el email existe, recibirás un link para restablecer tu contraseña.')
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
          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
            <button
              onClick={() => { setTab('login'); setError(''); setSuccess('') }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                tab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); setSuccess('') }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                tab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {authError && (
            <div className="bg-red-50 text-red-600 text-sm rounded-[10px] px-4 py-3 mb-4">
              Error de autenticación. Intentá de nuevo.
            </div>
          )}

          {success ? (
            <div className="bg-green-50 text-green-700 text-sm rounded-[10px] px-4 py-3 mb-4">
              {success}
            </div>
          ) : null}

          {tab === 'login' ? (
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
                    autoComplete="email"
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
                    autoComplete="current-password"
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
              <button
                type="button"
                onClick={handleForgot}
                disabled={loading}
                className="text-xs text-gray-400 hover:text-brand transition-colors text-center mt-1"
              >
                Olvidé mi contraseña
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
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
                    autoComplete="email"
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
                    placeholder="Mínimo 6 caracteres"
                    required
                    autoComplete="new-password"
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
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Confirmar contraseña</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="input pl-9"
                    placeholder="Repetí la contraseña"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary justify-center mt-1">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Crear cuenta
              </button>
            </form>
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
