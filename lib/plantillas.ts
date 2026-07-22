// Módulo Aplicaciones → Plantillas (documentos tipo Word: membretados, contratos, oficios, comunicados)

export const PLANTILLA_TIPOS = [
  { id: 'membretado', label: 'Membretado', icon: '📄' },
  { id: 'contrato', label: 'Contrato', icon: '📝' },
  { id: 'oficio', label: 'Oficio', icon: '🏛️' },
  { id: 'comunicado', label: 'Comunicado', icon: '📢' },
  { id: 'carta', label: 'Carta', icon: '✉️' },
  { id: 'otro', label: 'Otro', icon: '📁' },
]

export const PAPELES = [
  { id: 'A4', label: 'A4', w: 794, h: 1123 },     // px @ 96dpi
  { id: 'A5', label: 'A5', w: 559, h: 794 },
  { id: 'Carta', label: 'Carta', w: 816, h: 1056 },
]
export const papelById = (id: string) => PAPELES.find(p => p.id === id) ?? PAPELES[0]

// Catálogo de campos insertables (tokens {{grupo.campo}})
export const CAMPO_GRUPOS: { id: string; label: string; icon: string; campos: { token: string; label: string }[] }[] = [
  {
    id: 'comun', label: 'Común', icon: '🔧', campos: [
      { token: 'comun.fecha', label: 'Fecha actual' },
      { token: 'comun.fecha_larga', label: 'Fecha en letras' },
      { token: 'comun.empresa', label: 'Mi empresa' },
      { token: 'comun.ruc', label: 'RUC de mi empresa' },
      { token: 'comun.direccion', label: 'Dirección de mi empresa' },
      { token: 'comun.telefono', label: 'Teléfono de mi empresa' },
      { token: 'comun.email', label: 'Email de mi empresa' },
      { token: 'comun.web', label: 'Web de mi empresa' },
    ],
  },
  {
    id: 'cliente', label: 'Cliente', icon: '🏢', campos: [
      { token: 'cliente.nombre', label: 'Nombre / Razón social' },
      { token: 'cliente.ruc', label: 'RUC / DNI' },
      { token: 'cliente.direccion', label: 'Dirección' },
      { token: 'cliente.email', label: 'Email' },
      { token: 'cliente.telefono', label: 'Teléfono' },
    ],
  },
  {
    id: 'contacto', label: 'Contacto', icon: '👤', campos: [
      { token: 'contacto.nombre', label: 'Nombre del contacto' },
      { token: 'contacto.email', label: 'Email del contacto' },
      { token: 'contacto.telefono', label: 'Teléfono del contacto' },
    ],
  },
]

// Reemplaza {{grupo.campo}} por valores. Tokens sin dato quedan resaltados como pendientes.
export function renderTokens(html: string, data: Record<string, string>, opts?: { marcarVacios?: boolean }): string {
  return (html || '').replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_m, key: string) => {
    const v = data[key]
    if (v != null && v !== '') return escapeHtml(String(v))
    return opts?.marcarVacios ? `<span style="background:#fef08a;border-radius:3px;padding:0 2px">[${key}]</span>` : ''
  })
}
function escapeHtml(s: string) { return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string)) }

// Plantillas de inicio rápido por tipo
export const QUICK_START: Record<string, { encabezado: string; contenido: string; pie: string }> = {
  membretado: {
    encabezado: '<div style="text-align:center"><strong style="font-size:18px;color:#0d9488">{{comun.empresa}}</strong><br/><span style="font-size:11px;color:#666">{{comun.direccion}} · {{comun.telefono}} · {{comun.email}}</span></div>',
    contenido: '<p style="text-align:right">{{comun.fecha_larga}}</p><br/><p>Señores<br/><strong>{{cliente.nombre}}</strong><br/>{{cliente.direccion}}</p><br/><p>De nuestra consideración:</p><br/><p>____________________________________________________________</p>',
    pie: '<div style="text-align:center;font-size:10px;color:#888">{{comun.empresa}} · RUC {{comun.ruc}} · {{comun.web}}</div>',
  },
  contrato: {
    encabezado: '<div style="text-align:center"><strong style="font-size:16px">CONTRATO DE SERVICIOS DE DECORACIÓN</strong></div>',
    contenido: '<p>Conste por el presente documento el contrato que celebran de una parte <strong>{{comun.empresa}}</strong>, con RUC {{comun.ruc}}, y de otra parte <strong>{{cliente.nombre}}</strong>, con RUC {{cliente.ruc}}, domiciliado en {{cliente.direccion}}, en los términos siguientes:</p><br/><p><strong>PRIMERA.-</strong> ____________________________________________</p><br/><p><strong>SEGUNDA.-</strong> ___________________________________________</p>',
    pie: '<div style="font-size:11px;color:#555">Firma del contratante: ______________________&nbsp;&nbsp;&nbsp;&nbsp;Firma del cliente: ______________________</div>',
  },
  oficio: {
    encabezado: '<div style="text-align:center"><strong style="font-size:16px;color:#0d9488">{{comun.empresa}}</strong></div>',
    contenido: '<p>OFICIO N° _____-{{comun.fecha}}</p><br/><p>Señor(a):<br/><strong>{{contacto.nombre}}</strong><br/>{{cliente.nombre}}</p><br/><p><strong>Asunto:</strong> _______________________________</p><br/><p>Tengo el agrado de dirigirme a usted para ______________________________________________.</p><br/><p>Atentamente,</p>',
    pie: '<div style="text-align:center;font-size:10px;color:#888">{{comun.empresa}} · {{comun.direccion}}</div>',
  },
  comunicado: {
    encabezado: '<div style="text-align:center"><strong style="font-size:18px">COMUNICADO</strong></div>',
    contenido: '<p>Por medio del presente, <strong>{{comun.empresa}}</strong> comunica a {{cliente.nombre}} que ____________________________________________________.</p><br/><p style="text-align:right">{{comun.fecha_larga}}</p>',
    pie: '',
  },
  carta: {
    encabezado: '',
    contenido: '<p style="text-align:right">{{comun.fecha_larga}}</p><br/><p>Estimado(a) {{contacto.nombre}}:</p><br/><p>______________________________________________________________</p><br/><p>Cordialmente,<br/>{{comun.empresa}}</p>',
    pie: '',
  },
  otro: { encabezado: '', contenido: '<p></p>', pie: '' },
}
