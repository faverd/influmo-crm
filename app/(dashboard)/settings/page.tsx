'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Save, Bot, RotateCcw, Upload, Palette, Shield, Sun, Loader2, Check, ImageIcon, User,
} from 'lucide-react'
import { applyBrand } from '@/lib/color'
import { cn } from '@/lib/utils'

const DEFAULT_PROMPT = `Eres el asistente virtual de BERAGRO, empresa de nanotecnología vegetal y soluciones agrícolas en Perú. Tu rol es asesorar a agricultores de forma profesional, clara y útil.

REGLAS:
- Responde SIEMPRE en español, de forma profesional y cercana
- Recomienda productos basándote SOLO en la base de conocimiento (fichas técnicas cargadas)
- Incluye dosis, momentos de aplicación y fichas técnicas cuando sea relevante
- Nunca inventes precios ni datos que no tengas
- Usa tablas y emojis para que la información sea clara
- Para plagas/enfermedades, da diagnóstico y recomienda productos del catálogo
- Comparte el link de la ficha técnica cuando el usuario pida un catálogo o documento`

const SWATCHES = ['#0d9488', '#16a34a', '#0ea5e9', '#7c3aed', '#dc2626', '#ea580c', '#475569', '#0f172a']

// ── Image upload row ──────────────────────────────────────────────────────────

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
      if (res.ok) onUploaded(data.url)
    } finally { setUploading(false); if (ref.current) ref.current.value = '' }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
        {current
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={current} alt={label} className="w-full h-full object-cover" />
          : <ImageIcon size={20} className="text-gray-300" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mb-2">{hint}</p>
        <button onClick={() => ref.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Subir
        </button>
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
      </div>
    </div>
  )
}

// ── Color picker row ──────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white" />
        <input value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 bg-gray-50" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {SWATCHES.map(c => (
          <button key={c} onClick={() => onChange(c)} style={{ backgroundColor: c }}
            className={cn('w-9 h-9 rounded-lg transition-all hover:scale-110',
              value.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : '')} />
        ))}
      </div>
    </>
  )
}

// ── Main settings page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Branding state
  const [accent, setAccent] = useState('#0d9488')
  const [buttonColor, setButtonColor] = useState('#0d9488')
  const [bwMode, setBwMode] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState('')
  const [loginBg, setLoginBg] = useState('')
  const [loginLogo, setLoginLogo] = useState('')
  const [navLogo, setNavLogo] = useState('')

  // Bot prompt
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((settings: { key: string; value: string }[]) => {
        const get = (k: string) => settings.find(s => s.key === k)?.value
        setPrompt(get('system_prompt') ?? DEFAULT_PROMPT)
        setAccent(get('brand_accent_color') ?? '#0d9488')
        setButtonColor(get('brand_button_color') ?? '#0d9488')
        setBwMode(get('brand_bw_mode') === '1')
        setProfilePhoto(get('brand_profile_photo') ?? '')
        setLoginBg(get('brand_login_bg') ?? '')
        setLoginLogo(get('brand_login_logo') ?? '')
        setNavLogo(get('brand_nav_logo') ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Live preview of accent color
  useEffect(() => { if (!loading) applyBrand(accent) }, [accent, loading])
  useEffect(() => {
    if (loading) return
    document.documentElement.classList.toggle('bw-mode', bwMode)
  }, [bwMode, loading])

  async function saveKey(key: string, value: string) {
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
  }

  async function saveAll() {
    setSaving(true)
    await Promise.all([
      saveKey('brand_accent_color', accent),
      saveKey('brand_button_color', buttonColor),
      saveKey('brand_bw_mode', bwMode ? '1' : '0'),
      saveKey('system_prompt', prompt),
    ])
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Personaliza el entorno, colores e imágenes de la plataforma</p>
      </div>

      {/* Perfil */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Perfil</h2>
        <ImageUploader label="Foto de perfil de plataforma" hint="PNG o JPG · máx. 10 MB · Se guarda automáticamente al subir"
          current={profilePhoto} settingKey="brand_profile_photo" onUploaded={setProfilePhoto} />
      </div>

      {/* Apariencia */}
      <div className="card space-y-6">
        <h2 className="font-semibold text-gray-900">Apariencia</h2>

        {/* B&W toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun size={18} className="text-amber-400" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Modo blanco y negro</p>
              <p className="text-xs text-gray-400">Desactiva todos los colores de la interfaz</p>
            </div>
          </div>
          <button onClick={() => setBwMode(v => !v)}
            className={cn('relative w-12 h-6 rounded-full transition-colors', bwMode ? 'bg-gray-800' : 'bg-gray-200')}>
            <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', bwMode ? 'left-7' : 'left-1')} />
          </button>
        </div>

        {/* Accent color */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Palette size={15} className="text-gray-500" />
            <p className="font-medium text-gray-900 text-sm">Color de acento</p>
          </div>
          <p className="text-xs text-gray-400 mb-3">Color principal de la interfaz</p>
          <ColorPicker value={accent} onChange={setAccent} />
        </div>

        {/* Brand button color */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={15} className="text-gray-500" />
            <p className="font-medium text-gray-900 text-sm">Color del botón de marca</p>
          </div>
          <p className="text-xs text-gray-400 mb-3">Color para botones de acción principal</p>
          <ColorPicker value={buttonColor} onChange={setButtonColor} />
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-400">Vista previa:</span>
            <span className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: buttonColor }}>
              Botón de acción
            </span>
          </div>
        </div>
      </div>

      {/* Pantalla de inicio */}
      <div className="card space-y-5">
        <h2 className="font-semibold text-gray-900">Personalización de pantalla de inicio</h2>
        <ImageUploader label="Fondo de inicio de sesión" hint="PNG o JPG · máx. 10 MB · Se guarda automáticamente al subir"
          current={loginBg} settingKey="brand_login_bg" onUploaded={setLoginBg} />
        <ImageUploader label="Logo en pantalla de inicio" hint="PNG o JPG · máx. 10 MB · Se guarda automáticamente al subir"
          current={loginLogo} settingKey="brand_login_logo" onUploaded={setLoginLogo} />
      </div>

      {/* Plataforma */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Personalización de plataforma</h2>
        <ImageUploader label="Logo de la plataforma (nav superior)" hint="PNG o JPG · máx. 10 MB · Se guarda automáticamente al subir"
          current={navLogo} settingKey="brand_nav_logo" onUploaded={setNavLogo} />
      </div>

      {/* Bot prompt */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center">
              <Bot size={18} className="text-brand" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">System Prompt del agente</h3>
              <p className="text-xs text-gray-500">Define el comportamiento del agente IA</p>
            </div>
          </div>
          <button onClick={() => setPrompt(DEFAULT_PROMPT)} className="btn-outline text-xs">
            <RotateCcw size={13} /> Restaurar
          </button>
        </div>
        {loading ? <div className="h-40 bg-gray-50 rounded-xl animate-pulse" /> : (
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            className="input w-full font-mono text-xs leading-relaxed" rows={14} />
        )}
      </div>

      {/* Save */}
      <button onClick={saveAll} disabled={saving}
        className="w-full py-4 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        style={{ backgroundColor: buttonColor }}>
        {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : <Save size={18} />}
        {saved ? '¡Guardado!' : 'Guardar colores y configuración'}
      </button>
      <p className="text-center text-xs text-gray-400 -mt-2">
        Las imágenes se guardan automáticamente al subir. Solo los colores requieren guardar manualmente.
      </p>
    </div>
  )
}
