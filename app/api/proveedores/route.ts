import { makeCrud } from '@/lib/api-crud'

const PROVEEDOR_COLS = ['nombre', 'categoria', 'contacto', 'telefono', 'email', 'web', 'calificacion', 'notas']

export const { GET, POST, DELETE } = makeCrud('proveedores', PROVEEDOR_COLS, 'nombre')
