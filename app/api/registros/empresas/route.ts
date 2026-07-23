import { makeCrud } from '@/lib/api-crud'
import { EMPRESA_COLS } from '@/lib/registros'

export const { GET, POST, DELETE } = makeCrud('registro_empresas', EMPRESA_COLS, 'razon_social')
