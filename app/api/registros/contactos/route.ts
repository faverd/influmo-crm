import { makeCrud } from '@/lib/api-crud'
import { CONTACTO_COLS } from '@/lib/registros'

export const { GET, POST, DELETE } = makeCrud('registro_contactos', CONTACTO_COLS, 'nombre_completo')
