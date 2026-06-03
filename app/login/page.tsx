'use client'

import { useState, useEffect, Suspense } from 'react'
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

  // Branding
  const [brand, setBrand] = useState<Record<string, string>>({})
  useEffect(() => {
    fetch('/api/branding').then(r => r.json()).then(setBrand).catch(() => {})
  }, [])
  const accent = brand.brand_button_color || brand.brand_accent_color || '#16a34a'
  const loginBg = brand.brand_login_bg
  const loginLogo = brand.brand_login_logo

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    else router.push('/dashboard')
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error, data } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else if (data.session) router.push('/dashboard')
    else setSuccess('Cuenta creada. Revisá tu email para confirmarla.')
    setLoading(false)
  }

  async function handleForgot() {
    if (!email) { setError('Ingresá tu email primero'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/api/auth/callback` })
    setSuccess('Si el email existe, recibirás un link para restablecer tu contraseña.')
    setLoading(false)
  }

  async function oauth(provider: 'google' | 'apple') {
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider, options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) setError(`${provider} no está configurado aún`)
  }

  // ── Form panel (shared) ──
  const formPanel = (
    <div className="w-full max-w-sm mx-auto">
      {/* Logo */}
      <div className="mb-8">
        {loginLogo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={loginLogo} alt="Logo" className="h-10 object-contain" />
          : <span className="text-2xl font-extrabold tracking-tight" style={{ color: accent }}>LOGO</span>}
      </div>

      <h1 className="text-3xl font-extrabold text-slate-800 mb-6">
        {tab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
      </h1>

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
        <button onClick={() => { setTab('login'); setError(''); setSuccess('') }}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          Ingresar
        </button>
        <button onClick={() => { setTab('register'); setError(''); setSuccess('') }}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          Crear cuenta
        </button>
      </div>

      {authError && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">Error de autenticación. Intentá de nuevo.</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">{success}</div>}

      <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="flex flex-col gap-3">
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
            placeholder="correo@dominio.com"
            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all"
            style={{ '--tw-ring-color': accent + '55' } as React.CSSProperties} />
        </div>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••••"
            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all"
            style={{ '--tw-ring-color': accent + '55' } as React.CSSProperties} />
          <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {tab === 'register' && (
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required
              autoComplete="new-password" placeholder="Repetí la contraseña"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all"
              style={{ '--tw-ring-color': accent + '55' } as React.CSSProperties} />
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-white font-bold text-sm uppercase tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
          style={{ backgroundColor: accent }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : tab === 'login' ? <ArrowRight size={16} /> : <UserPlus size={16} />}
          {tab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </button>

        {tab === 'login' && (
          <button type="button" onClick={handleForgot} disabled={loading}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center">
            Olvidé mi contraseña
          </button>
        )}
      </form>

      {/* Divider + OAuth */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">o continuar con</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="flex flex-col gap-2">
        <button onClick={() => oauth('google')}
          className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 5.1 29.5 3 24 3 16 3 9.1 7.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 36 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.1 42.3 16 47 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 36 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
          Continuar con Google
        </button>
        <button onClick={() => oauth('apple')}
          className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.89-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.47 7.83 1.3 10.39.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.28 3.14-2.54.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.13zM14.53 4.41c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.09 3.18 1.15.09 2.32-.58 3.04-1.45z"/></svg>
          Continuar con Apple
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        {formPanel}
      </div>

      {/* Right: decorative panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center"
        style={loginBg
          ? { backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: `linear-gradient(135deg, ${accent}22, #93c5fd55)` }}>
        {!loginBg && (
          <>
            {/* Animated dots */}
            {Array.from({ length: 22 }).map((_, i) => {
              const colors = [accent, '#3b82f6', '#84cc16']
              const size = 8 + (i % 5) * 6
              return (
                <span key={i} className="absolute rounded-full opacity-70 animate-pulse"
                  style={{
                    width: size, height: size,
                    backgroundColor: colors[i % 3],
                    top: `${(i * 37) % 90 + 5}%`, left: `${(i * 53) % 90 + 5}%`,
                    animationDelay: `${(i % 5) * 0.4}s`, animationDuration: `${2 + (i % 3)}s`,
                  }} />
              )
            })}
            <div className="relative z-10 text-center px-12">
              {loginLogo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={loginLogo} alt="Logo" className="h-16 object-contain mx-auto mb-4 opacity-90" />
                : null}
              <p className="text-slate-700/70 text-sm font-medium">Plataforma de Decoración de Interiores</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
