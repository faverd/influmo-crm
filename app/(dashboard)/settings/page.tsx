'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Save, Bot, RotateCcw, Upload, Palette, Shield, Sun, Loader2, Check,
  ImageIcon, Plus, X, Trash2, ChevronRight, Users, FileText, Smartphone,
  MessageSquareText, ShieldCheck, AlertTriangle, ExternalLink,
} from 'lucide-react'
import { applyBrand } from '@/lib/color'
import { cn } from '@/lib/utils'
import { clearBrandingCache, applyBrandingChrome } from '@/lib/branding-cache'

const DEFAULT_PROMPT = `Eres el asistente virtual de Influmo CRM, plataforma de gestión para empresas de Decoración de Interiores en Perú. Tu rol es asesorar a diseñadores, decoradores y gestores de negocio de forma profesional, clara y útil.

REGLAS:
- Responde SIEMPRE en español, de forma profesional y cercana
- Especialízate en: cortinas, persianas, tapizado, mobiliario, iluminación, pintura y proyectos integrales de decoración
- Recomienda soluciones basándote en la base de conocimiento disponible (catálogos, fichas de producto)
- Nunca inventes precios ni datos que no tengas
- Usa tablas y emojis para que la información sea clara y visual
- Para consultas de materiales, da recomendaciones con especificaciones técnicas
- Comparte información de garantías y tiempos de entrega cuando sea relevante`

const SWATCHES = ['#0d9488','#16a34a','#0ea5e9','#7c3aed','#dc2626','#ea580c','#475569','#0f172a']

const MODULES_DECO = [
  'Dashboard','Gestión Contactos','Finanzas','Kanban','Calendario',
  'Consultor BOT IA','Almacén','Proyectos','Comunicación','WhatsApp',
  'Aplicaciones','Geolocalización','Configuración','Administración',
]

// ── Image uploader ──────────────────────────────────────────────────────────
function ImageUploader({ label, hint, current, settingKey, onUploaded }: {
  label: string; hint: string; current?: string; settingKey: string; onUploaded: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const form = new FormData(); form.append('file', file); form.append('key', settingKey)
      const res = await fetch('/api/branding/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok) {
        onUploaded(data.url)
        clearBrandingCache()
        applyBrandingChrome({ [settingKey]: data.url })
      }
    } finally { setUploading(false); if (ref.current) ref.current.value = '' }
  }

  async function remove() {
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: settingKey, value: '' }),
    })
    onUploaded('')
    clearBrandingCache()
  }

  return (
    <div className="flex items-start gap-4">
      <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
        {current
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={current} alt={label} className="w-full h-full object-cover" />
          : <ImageIcon size={20} className="text-gray-300" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mb-2">{hint}</p>
        <div className="flex gap-2">
          <button onClick={() => ref.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Cambiar
          </button>
          {current && (
            <button onClick={remove}
              className="flex items-center gap-1 px-3 py-1.5 border border-red-100 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition">
              <Trash2 size={12} /> Eliminar
            </button>
          )}
        </div>
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
      </div>
    </div>
  )
}

// ── Color picker ────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white" />
        <input value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/20 bg-gray-50 uppercase" />
        <span className="w-9 h-9 rounded-xl border border-gray-200 shrink-0" style={{ backgroundColor: value }} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {SWATCHES.map(c => (
          <button key={c} onClick={() => onChange(c)} style={{ backgroundColor: c }}
            className={cn('w-9 h-9 rounded-xl transition-all hover:scale-110',
              value.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : '')} />
        ))}
      </div>
    </>
  )
}

// ── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`relative w-12 h-6 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
    </button>
  )
}

// ── Section card ────────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
        {icon && <span>{icon}</span>} {title}
      </h2>
      {children}
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Branding
  const [accent, setAccent]           = useState('#0d9488')
  const [buttonColor, setButtonColor] = useState('#0d9488')
  const [bwMode, setBwMode]           = useState(false)
  const [profilePhoto, setProfilePhoto] = useState('')
  const [loginBg, setLoginBg]         = useState('')
  const [loginBgRight, setLoginBgRight] = useState('')
  const [loginLogo, setLoginLogo]     = useState('')
  const [loginLogoRight, setLoginLogoRight] = useState('')
  const [navLogo, setNavLogo]         = useState('')
  const [brandIcon, setBrandIcon]     = useState('')

  // Sidebar
  const [sidebarPos, setSidebarPos]   = useState<'izquierda'|'derecha'>('izquierda')
  const [sidebarSize, setSidebarSize] = useState<'pequeño'|'normal'|'grande'>('normal')
  const [sidebarColor, setSidebarColor] = useState('#ffffff')
  const [sidebarActiveColor, setSidebarActiveColor] = useState('#0d9488')
  const [sidebarReduced, setSidebarReduced] = useState(false)

  // Login page customization
  const [loginTitle, setLoginTitle]   = useState('Diseño de interiores inteligente para espacios que enamoran')
  const [loginSubtitle, setLoginSubtitle] = useState('Gestión de proyectos, cotizaciones, clientes y un asesor IA — todo en un solo lugar.')
  const [loginGreeting, setLoginGreeting] = useState('BIENVENIDOS')
  const [loginSubGreeting, setLoginSubGreeting] = useState('Inicia sesión con Google o tu correo')
  const [loginFontType, setLoginFontType] = useState<'circular'|'serif'|'noto'|'roboto'>('circular')
  const [loginFontSize, setLoginFontSize] = useState<'pequeño'|'normal'|'grande'>('pequeño')

  // Platform
  const [appName, setAppName]         = useState('Influmo CRM')
  const [appTagline, setAppTagline]   = useState('Decoración de Interiores')

  // Authorized emails
  const [authEmails, setAuthEmails]   = useState(['graficjpc@gmail.com','nhancco@gmail.com','ventas@decorinteriores.pe'])
  const [newEmail, setNewEmail]       = useState('')

  // Cotización PDF
  const [cotLogo, setCotLogo]         = useState('')
  const [cotEmpresa, setCotEmpresa]   = useState('Influmo Deco SAC')
  const [cotRuc, setCotRuc]           = useState('')
  const [cotTel, setCotTel]           = useState('+51 946 591 988')
  const [cotEmail2, setCotEmail2]     = useState('info@decorinteriores.pe')
  const [cotDir, setCotDir]           = useState('Villa El Salvador, Lima, Perú')
  const [cotWeb, setCotWeb]           = useState('www.decorinteriores.pe')
  const [cotMoneda, setCotMoneda]     = useState('PEN')
  const [cotTerminos, setCotTerminos] = useState('Los precios incluyen IGV. Validez del presupuesto según los días indicados. Pago por transferencia o depósito.')
  const [cotFooterHtml, setCotFooterHtml] = useState('')

  // Bot prompt
  const [prompt, setPrompt]           = useState('')

  // WhatsApp status
  const [waStatus, setWaStatus] = useState<{connected:boolean; verify_token_set:boolean} | null>(null)

  useEffect(() => {
    fetch('/api/whatsapp/status').then(r => r.json())
      .then(d => setWaStatus({ connected: d.connected, verify_token_set: d.webhook_verify_token_set }))
      .catch(() => setWaStatus({ connected: false, verify_token_set: false }))
  }, [])

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((settings: {key:string;value:string}[]) => {
      const get = (k: string) => settings.find(s => s.key === k)?.value
      setPrompt(get('system_prompt') ?? DEFAULT_PROMPT)
      setAccent(get('brand_accent_color') ?? '#0d9488')
      setButtonColor(get('brand_button_color') ?? '#0d9488')
      setBwMode(get('brand_bw_mode') === '1')
      setProfilePhoto(get('brand_profile_photo') ?? '')
      setLoginBg(get('brand_login_bg') ?? '')
      setLoginBgRight(get('brand_login_bg_right') ?? '')
      setLoginLogo(get('brand_login_logo') ?? '')
      setLoginLogoRight(get('brand_login_logo_right') ?? '')
      setNavLogo(get('brand_nav_logo') ?? '')
      setLoginTitle(get('brand_login_title') ?? loginTitle)
      setLoginSubtitle(get('brand_login_subtitle') ?? loginSubtitle)
      setLoginGreeting(get('brand_login_greeting') ?? loginGreeting)
      setLoginSubGreeting(get('brand_login_subgreeting') ?? loginSubGreeting)
      setAppName(get('brand_app_name') ?? appName)
      setAppTagline(get('brand_app_tagline') ?? appTagline)
      setCotLogo(get('cot_logo') ?? '')
      setCotEmpresa(get('cot_empresa') ?? cotEmpresa)
      setCotRuc(get('cot_ruc') ?? '')
      setCotTel(get('cot_tel') ?? cotTel)
      setCotEmail2(get('cot_email') ?? cotEmail2)
      setCotDir(get('cot_direccion') ?? cotDir)
      setCotWeb(get('cot_web') ?? cotWeb)
      setCotMoneda(get('cot_moneda') ?? cotMoneda)
      setCotTerminos(get('cot_terminos') ?? cotTerminos)
      setCotFooterHtml(get('cot_footer_html') ?? '')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { if (!loading) applyBrand(accent) }, [accent, loading])
  useEffect(() => {
    if (loading) return
    document.documentElement.classList.toggle('bw-mode', bwMode)
  }, [bwMode, loading])

  async function saveKey(key: string, value: string) {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) })
  }

  async function saveAll() {
    setSaving(true)
    await Promise.all([
      saveKey('brand_accent_color', accent),
      saveKey('brand_button_color', buttonColor),
      saveKey('brand_bw_mode', bwMode ? '1' : '0'),
      saveKey('system_prompt', prompt),
      saveKey('brand_login_title', loginTitle),
      saveKey('brand_login_subtitle', loginSubtitle),
      saveKey('brand_login_greeting', loginGreeting),
      saveKey('brand_login_subgreeting', loginSubGreeting),
      saveKey('brand_app_name', appName),
      saveKey('brand_app_tagline', appTagline),
      saveKey('cot_empresa', cotEmpresa),
      saveKey('cot_ruc', cotRuc),
      saveKey('cot_tel', cotTel),
      saveKey('cot_email', cotEmail2),
      saveKey('cot_direccion', cotDir),
      saveKey('cot_web', cotWeb),
      saveKey('cot_moneda', cotMoneda),
      saveKey('cot_terminos', cotTerminos),
      saveKey('cot_footer_html', cotFooterHtml),
    ])
    clearBrandingCache()
    applyBrandingChrome({ brand_app_name: appName, brand_app_tagline: appTagline })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const radioBtn = (active: boolean) => cn(
    'flex-1 py-2 text-xs font-semibold rounded-lg border transition text-center',
    active ? 'bg-brand text-white border-brand' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
  )

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-5 pb-16">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Personaliza el entorno, colores e imágenes de la plataforma</p>
      </div>

      {/* ── Perfil ─────────────────────────────────────────────── */}
      <Section title="Perfil" icon="👤">
        <ImageUploader label="Foto de perfil de plataforma"
          hint="PNG o JPG · máx. 10 MB · Se guarda automáticamente al subir"
          current={profilePhoto} settingKey="brand_profile_photo" onUploaded={setProfilePhoto} />
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Tipo de letra</label>
          <div className="flex gap-2">
            {['Circular','Serif','Noto','Roboto'].map(f => (
              <button key={f} onClick={() => {}}
                className={radioBtn(f === 'Circular')}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Apariencia ──────────────────────────────────────────── */}
      <Section title="Apariencia" icon="🎨">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun size={18} className="text-amber-400" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Modo blanco y negro</p>
              <p className="text-xs text-gray-400">Desactiva todos los colores de la interfaz</p>
            </div>
          </div>
          <Toggle on={bwMode} onChange={setBwMode} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Palette size={14} className="text-gray-500" />
            <p className="font-medium text-gray-900 text-sm">Color de acento</p>
          </div>
          <p className="text-xs text-gray-400 mb-3">Color principal de la interfaz</p>
          <ColorPicker value={accent} onChange={setAccent} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-gray-500" />
            <p className="font-medium text-gray-900 text-sm">Color del botón de acento</p>
          </div>
          <p className="text-xs text-gray-400 mb-3">Color para botones de acción principal</p>
          <ColorPicker value={buttonColor} onChange={setButtonColor} />
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-400">Vista previa:</span>
            <button className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition hover:opacity-90"
              style={{ backgroundColor: buttonColor }}>Botón de acción</button>
          </div>
        </div>
      </Section>

      {/* ── Barra lateral ───────────────────────────────────────── */}
      <Section title="Barra lateral (menú izquierdo)" icon="📋">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Posición</label>
          <div className="flex gap-2">
            {(['izquierda','derecha'] as const).map(p => (
              <button key={p} onClick={() => setSidebarPos(p)}
                className={radioBtn(sidebarPos === p)}>
                {p.charAt(0).toUpperCase()+p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Tamaño de letra</label>
          <div className="flex gap-2">
            {(['Pequeño','Normal','Grande'] as string[]).map(s => (
              <button key={s} onClick={() => setSidebarSize(s.toLowerCase() as 'pequeño'|'normal'|'grande')}
                className={radioBtn(sidebarSize === s.toLowerCase())}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Color de barra</label>
          <div className="flex gap-3">
            {['#ffffff','#111827','#ecfdf5','#1e3a5f'].map(c => (
              <button key={c} onClick={() => setSidebarColor(c)}
                className={cn('w-9 h-9 rounded-xl border-2 transition-all hover:scale-105',
                  sidebarColor === c ? 'border-brand scale-105' : 'border-gray-200')}
                style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={sidebarColor} onChange={e => setSidebarColor(e.target.value)}
              className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer p-0.5" />
          </div>
          <div className="flex gap-3 mt-2 text-xs text-gray-400">
            {['Blanco','Negro','Verde claro','Azul oscuro',''].map((l,i) => <span key={i} className="w-9 text-center">{l}</span>)}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Color del texto activo</label>
          <div className="flex gap-3">
            {['#22c55e','#f59e0b','#3b82f6','#ec4899'].map(c => (
              <button key={c} onClick={() => setSidebarActiveColor(c)}
                className={cn('w-9 h-9 rounded-xl border-2 transition-all hover:scale-105',
                  sidebarActiveColor === c ? 'border-gray-400 scale-105' : 'border-gray-200')}
                style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={sidebarActiveColor} onChange={e => setSidebarActiveColor(e.target.value)}
              className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer p-0.5" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Reducida</p>
            <p className="text-xs text-gray-400">Mostrar barra lateral compacta por defecto</p>
          </div>
          <Toggle on={sidebarReduced} onChange={setSidebarReduced} />
        </div>
        <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          ✓ Solo tienes que recargar la página en el CRM para aplicar los cambios en la barra lateral
        </p>
      </Section>

      {/* ── Pantalla inicio sesión ──────────────────────────────── */}
      <Section title="Pantalla de inicio de sesión" icon="🖥️">
        {/* Previews */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center text-white text-[10px] font-medium overflow-hidden border border-gray-700">
            {loginBg ? <img src={loginBg} alt="bg" className="w-full h-full object-cover" /> : 'Línea sólida'}
          </div>
          <div className="aspect-video bg-black rounded-xl flex items-center justify-center text-white text-[10px] font-medium">Negro</div>
          <div className="aspect-video bg-brand rounded-xl flex items-center justify-center text-white text-[10px] font-medium">Verde</div>
        </div>

        <ImageUploader label="Fondo del panel (panel izquierdo)"
          hint="PNG o JPG · Se guarda al subir"
          current={loginBg} settingKey="brand_login_bg" onUploaded={setLoginBg} />
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Título (panel izquierdo)</label>
          <textarea value={loginTitle} onChange={e => setLoginTitle(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Subtítulo (panel izquierdo)</label>
          <textarea value={loginSubtitle} onChange={e => setLoginSubtitle(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Desde (bienvenida)</label>
            <input value={loginGreeting} onChange={e => setLoginGreeting(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Texto bajo el saludo</label>
            <input value={loginSubGreeting} onChange={e => setLoginSubGreeting(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Tipo de letra</label>
          <div className="flex gap-2">
            {(['Circular','Serif','Noto','Roboto'] as string[]).map(f => (
              <button key={f} onClick={() => setLoginFontType(f.toLowerCase() as typeof loginFontType)}
                className={radioBtn(loginFontType === f.toLowerCase())}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Tamaño del texto</label>
          <div className="flex gap-2 w-48">
            {(['Pequeño','Normal','Grande'] as string[]).map(s => (
              <button key={s} onClick={() => setLoginFontSize(s.toLowerCase() as typeof loginFontSize)}
                className={radioBtn(loginFontSize === s.toLowerCase())}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3 border-t border-gray-100 pt-3">
          <ImageUploader label="Fondo del formulario (panel derecho)"
            hint="PNG o JPG · Se guarda al subir"
            current={loginBgRight} settingKey="brand_login_bg_right" onUploaded={setLoginBgRight} />
          <ImageUploader label="Logo del formulario (lado derecho)"
            hint="PNG o JPG · Se guarda al subir"
            current={loginLogo} settingKey="brand_login_logo" onUploaded={setLoginLogo} />
          <ImageUploader label="Logo del formulario (logo derecha)"
            hint="PNG o JPG · Se guarda al subir"
            current={loginLogoRight} settingKey="brand_login_logo_right" onUploaded={setLoginLogoRight} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Vistas demo del logo</p>
          <div className="grid grid-cols-3 gap-3">
            {['Una tabla','Degradado','Imagen'].map(v => (
              <div key={v} className={cn('aspect-video rounded-xl border-2 flex items-center justify-center text-[10px] font-medium',
                v==='Imagen'?'border-brand bg-brand/5 text-brand':'border-gray-200 bg-gray-50 text-gray-400')}>{v}</div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Personalización de plataforma ──────────────────────── */}
      <Section title="Personalización de plataforma" icon="🏢">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre de la plataforma</label>
            <input value={appName} onChange={e => setAppName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Subtítulo / Sector</label>
            <input value={appTagline} onChange={e => setAppTagline(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
        </div>
        <ImageUploader label="Ícono de la pestaña (favicon)"
          hint="PNG cuadrado · 32×32 o 64×64 px recomendado"
          current={brandIcon} settingKey="brand_favicon" onUploaded={setBrandIcon} />
        <ImageUploader label="Logo de la plataforma (nav superior)"
          hint="PNG o SVG · fondo transparente · Se guarda al subir"
          current={navLogo} settingKey="brand_nav_logo" onUploaded={setNavLogo} />
      </Section>

      {/* ── WhatsApp Business Cloud API ─────────────────────────── */}
      <Section title="WhatsApp Business Cloud API" icon="📲">
        <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl',
          waStatus?.connected ? 'bg-green-50' : 'bg-amber-50')}>
          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0',
            waStatus?.connected ? 'bg-green-100' : 'bg-amber-100')}>
            <MessageSquareText size={16} className={waStatus?.connected ? 'text-green-600' : 'text-amber-600'} />
          </div>
          <div className="flex-1">
            <p className={cn('text-sm font-semibold', waStatus?.connected ? 'text-green-700' : 'text-amber-700')}>
              {waStatus === null ? 'Verificando…' : waStatus.connected ? 'Conectado' : 'No conectado'}
            </p>
            <p className="text-xs text-gray-500">
              {waStatus?.connected
                ? 'Envío y recepción de mensajes activos vía Meta Cloud API'
                : 'Faltan variables de entorno WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN'}
            </p>
          </div>
          {waStatus?.connected ? <ShieldCheck size={18} className="text-green-500" /> : <AlertTriangle size={18} className="text-amber-500" />}
        </div>
        <div className="text-xs text-gray-500 space-y-1.5">
          <p><strong>Webhook callback URL:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">https://influmo-crm.vercel.app/api/webhook</code></p>
          <p><strong>Verify token configurado:</strong> {waStatus?.verify_token_set ? 'Sí ✓' : 'No — agrega WHATSAPP_VERIFY_TOKEN'}</p>
          <p><strong>Campo suscrito en Meta:</strong> messages</p>
        </div>
        <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
          <ExternalLink size={13} /> Administrar en Meta for Developers
        </a>
        <a href="/whatsapp"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition">
          <MessageSquareText size={14} /> Ir a WhatsApp
        </a>
      </Section>

      {/* ── Correos autorizados ─────────────────────────────────── */}
      <Section title="Correos autorizados" icon="✉️">
        <p className="text-xs text-gray-400 -mt-2">Solo estas cuentas pueden registrarse en la plataforma</p>
        <form onSubmit={e => { e.preventDefault(); if (newEmail && !authEmails.includes(newEmail)) { setAuthEmails(a => [...a, newEmail]); setNewEmail('') } }}
          className="flex gap-2">
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
            placeholder="correo@empresa.com"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 transition">
            <Plus size={14} /> Agregar
          </button>
        </form>
        <div className="space-y-1.5">
          {authEmails.map(em => (
            <div key={em} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-700">{em}</span>
              <button onClick={() => setAuthEmails(a => a.filter(x => x !== em))}
                className="text-gray-400 hover:text-red-500 transition"><X size={13} /></button>
            </div>
          ))}
        </div>
        <button className="w-full py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:opacity-90 transition">
          Guardar correos autorizados
        </button>
      </Section>

      {/* ── Roles de usuario ────────────────────────────────────── */}
      <Section title="Roles de usuario" icon="👥">
        <p className="text-xs text-gray-400 -mt-2">Gestión de acceso y permisos por rol</p>
        <div className="space-y-2">
          {[
            { email:'graficjpc@gmail.com', role:'Administrador', color:'purple' },
            { email:'nhancco@gmail.com',   role:'Diseñador',     color:'blue' },
            { email:'ventas@decorinteriores.pe', role:'Decorador', color:'green' },
          ].map(u => (
            <div key={u.email} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-700">{u.email}</span>
              <div className="flex items-center gap-2">
                <select defaultValue={u.role}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                  <option>Administrador</option>
                  <option>Diseñador</option>
                  <option>Decorador</option>
                  <option>Empresa Deco</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Partida de cotización PDF ───────────────────────────── */}
      <Section title="Partida de cotización (PDF)" icon="📄">
        <p className="text-xs text-gray-400 -mt-2">Datos que aparecerán en tus cotizaciones y facturas PDF</p>
        <ImageUploader label="Logo de la cotización"
          hint="PNG con fondo transparente · Se guarda al subir"
          current={cotLogo} settingKey="cot_logo" onUploaded={setCotLogo} />
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre / Razón social</label>
            <input value={cotEmpresa} onChange={e => setCotEmpresa(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">RUC</label>
            <input value={cotRuc} onChange={e => setCotRuc(e.target.value)} placeholder="20000000001"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Teléfono</label>
            <input value={cotTel} onChange={e => setCotTel(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
            <input value={cotEmail2} onChange={e => setCotEmail2(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Sitio web</label>
            <input value={cotWeb} onChange={e => setCotWeb(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Dirección</label>
            <input value={cotDir} onChange={e => setCotDir(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Moneda</label>
            <select value={cotMoneda} onChange={e => setCotMoneda(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
              <option value="PEN">PEN (S/.)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nota y términos</label>
            <textarea value={cotTerminos} onChange={e => setCotTerminos(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Bloque inferior derecho (HTML)</label>
          <p className="text-xs text-gray-400 mb-2">Código HTML para el área inferior del PDF (datos bancarios, QR, etc.)</p>
          <textarea value={cotFooterHtml} onChange={e => setCotFooterHtml(e.target.value)} rows={5}
            placeholder={'<div style="font-size:11px">\n  <b>BBVA</b> 0011-0111 en soles en la cuenta 00-01234-5 6<br/>\n  <b>BBVA</b> 0011 0111 dolares dolar 00-01234-5 5\n</div>'}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none bg-gray-50" />
        </div>
      </Section>

      {/* ── Aplicación móvil ────────────────────────────────────── */}
      <Section title="Aplicación móvil" icon="📱">
        <div className="flex gap-6">
          <div className="flex-1 space-y-3">
            <p className="text-xs text-gray-400">Configura cómo se instala la app en dispositivos móviles</p>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Ícono / logo de la app</label>
              <ImageUploader label="" hint="PNG cuadrado · 512×512 px" current="" settingKey="pwa_icon" onUploaded={() => {}} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Otras rutas de instalación</label>
              <p className="text-xs text-gray-400">Manifest: /manifest.json · App: influmo-crm.vercel.app<br/>
              MotionPlot: Acceso → Inicio → Agregar al inicio → Agregar</p>
            </div>
          </div>
          <div className="shrink-0">
            <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center">
              <Smartphone size={40} className="text-gray-300" />
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1">Escanea para instalar</p>
            <p className="text-[10px] text-gray-400 text-center">Servidor: APK / (PilaR-Dev)</p>
          </div>
        </div>
      </Section>

      {/* ── System Prompt ───────────────────────────────────────── */}
      <Section title="System Prompt del agente IA" icon="🤖">
        <p className="text-xs text-gray-500">Define el comportamiento del asistente BOT IA para tu negocio de decoración</p>
        <div className="flex justify-end">
          <button onClick={() => setPrompt(DEFAULT_PROMPT)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition">
            <RotateCcw size={11} /> Restaurar
          </button>
        </div>
        {loading ? (
          <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/20 bg-gray-50" rows={14} />
        )}
      </Section>

      {/* ── Save ────────────────────────────────────────────────── */}
      <button onClick={saveAll} disabled={saving}
        className="w-full py-4 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2 transition disabled:opacity-60 hover:opacity-90"
        style={{ backgroundColor: buttonColor }}>
        {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : <Save size={18} />}
        {saved ? '¡Guardado!' : 'Guardar colores y configuración'}
      </button>
      <p className="text-center text-xs text-gray-400 -mt-2">
        Las imágenes se guardan automáticamente al subir. Solo los colores y el prompt requieren guardar.
      </p>
    </div>
  )
}
