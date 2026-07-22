'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, ChevronLeft } from 'lucide-react'

function LoginForm() {
  const [step, setStep] = useState<'email' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastEmail, setLastEmail] = useState('')
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')
  const router = useRouter()

  // Branding
  const [brand, setBrand] = useState<Record<string, string>>({})
  useEffect(() => {
    fetch('/api/branding').then(r => r.json()).then(setBrand).catch(() => {})
    try { setLastEmail(localStorage.getItem('deco_last_email') ?? '') } catch { /* ignore */ }
  }, [])

  const accent = brand.brand_button_color || brand.brand_accent_color || '#0d9488'
  const loginBg = brand.brand_login_bg
  const loginLogo = brand.brand_login_logo || brand.brand_login_logo_right
  const navLogo = brand.brand_nav_logo
  const appName = brand.brand_app_name || 'Influmo CRM'
  const title = brand.brand_login_title || 'Diseño de interiores inteligente para espacios que enamoran'
  const subtitle = brand.brand_login_subtitle || 'Gestión de proyectos, cotizaciones, clientes y un asesor IA — todo en un solo lugar.'
  const greeting = brand.brand_login_greeting || 'BIENVENIDOS'
  const subGreeting = brand.brand_login_subgreeting || `Inicia sesión en ${appName} con Google o tu correo.`

  function continueWithEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setStep('password')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos')
    else {
      try { localStorage.setItem('deco_last_email', email) } catch { /* ignore */ }
      router.push('/dashboard')
    }
    setLoading(false)
  }

  async function handleForgot() {
    if (!email) { setError('Ingresa tu correo primero'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/api/auth/callback` })
    setSuccess('Si el correo existe, recibirás un link para restablecer tu contraseña.')
    setLoading(false)
  }

  async function oauth(provider: 'google' | 'apple') {
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider, options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) setError(`${provider === 'google' ? 'Google' : 'Apple'} no está configurado aún`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden"
      style={{ background: `radial-gradient(circle at 20% 20%, ${accent}18, transparent 45%), radial-gradient(circle at 80% 80%, ${accent}12, transparent 45%), #f7f8fa` }}>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden flex flex-col lg:flex-row min-h-[560px]">
        {/* ── Left: decorative image panel ─────────────────────── */}
        <div className="lg:w-[45%] relative hidden sm:flex flex-col justify-end overflow-hidden"
          style={loginBg
            ? { backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined}>
          {!loginBg && (
            <>
              {/* Decor-themed CSS illustration: fabric/curtain folds */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#1e293b" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                <rect width="400" height="600" fill="url(#bgGrad)" />
                {Array.from({ length: 9 }).map((_, i) => (
                  <path key={i}
                    d={`M${i * 48} 0 C ${i * 48 + 20} 150, ${i * 48 - 20} 300, ${i * 48 + 30} 450 S ${i * 48 - 10} 600, ${i * 48 + 20} 600`}
                    stroke="white" strokeOpacity="0.08" strokeWidth="30" fill="none" />
                ))}
                <circle cx="330" cy="90" r="70" fill="white" opacity="0.06" />
                <circle cx="60" cy="480" r="110" fill="white" opacity="0.05" />
              </svg>
            </>
          )}
          {/* Dark gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="relative z-10 p-8 text-white">
            {navLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={navLogo} alt={appName} className="h-8 object-contain mb-4 opacity-95" />
            )}
            <p className="text-lg font-semibold leading-snug mb-2">{title}</p>
            <p className="text-xs text-white/75 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {/* ── Right: form panel ─────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-sm">
            {/* Logo */}
            <div className="mb-6">
              {loginLogo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={loginLogo} alt={appName} className="h-9 object-contain" />
                : <span className="text-xl font-extrabold tracking-tight" style={{ color: accent }}>{appName}</span>}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-800 mb-1">{greeting}</h1>
            <p className="text-sm text-gray-500 mb-6">{subGreeting}</p>

            {authError && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">Error de autenticación. Intenta de nuevo.</div>}
            {success && <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">{success}</div>}

            {/* OAuth buttons */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button onClick={() => oauth('apple')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.89-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.47 7.83 1.3 10.39.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.28 3.14-2.54.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.13zM14.53 4.41c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.09 3.18 1.15.09 2.32-.58 3.04-1.45z"/></svg>
                Apple
              </button>
              <button onClick={() => oauth('google')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                <svg width="15" height="15" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 5.1 29.5 3 24 3 16 3 9.1 7.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 36 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.1 42.3 16 47 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 36 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
                Google
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">o</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {step === 'email' ? (
              <form onSubmit={continueWithEmail} className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-600">Correo electrónico</label>
                    {lastEmail && (
                      <button type="button" onClick={() => setEmail(lastEmail)}
                        className="text-[11px] font-medium hover:underline" style={{ color: accent }}>
                        Último uso
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
                      placeholder="Ingrese su dirección de correo electrónico" autoFocus
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all"
                      style={{ '--tw-ring-color': accent + '55' } as React.CSSProperties} />
                  </div>
                </div>

                <button type="submit"
                  className="w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-1"
                  style={{ backgroundColor: accent }}>
                  Continuar <ArrowRight size={16} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <button type="button" onClick={() => { setStep('email'); setError('') }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-1 w-fit">
                  <ChevronLeft size={13} /> {email}
                </button>

                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    autoComplete="current-password" placeholder="••••••••••" autoFocus
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all"
                    style={{ '--tw-ring-color': accent + '55' } as React.CSSProperties} />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
                  style={{ backgroundColor: accent }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Iniciar sesión
                </button>

                <button type="button" onClick={handleForgot} disabled={loading}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center">
                  Olvidé mi contraseña
                </button>
              </form>
            )}

            <p className="text-center text-xs text-gray-400 mt-6">
              Acceso restringido · solo usuarios autorizados
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
