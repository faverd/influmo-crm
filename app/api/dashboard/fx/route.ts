import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// USD/PEN exchange rate (and a few extras) from a free FX API
export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } })
    const data = await res.json()
    const rates = data.rates ?? {}
    return NextResponse.json({
      base: 'USD',
      updated: data.time_last_update_utc ?? null,
      pen: rates.PEN ?? null,   // soles
      eur: rates.EUR ?? null,
      brl: rates.BRL ?? null,
      clp: rates.CLP ?? null,
    }, { headers: { 'Cache-Control': 'public, max-age=1800' } })
  } catch {
    return NextResponse.json({ error: 'No se pudo obtener el tipo de cambio' }, { status: 500 })
  }
}
