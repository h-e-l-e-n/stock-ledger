import { NextResponse } from 'next/server'
import { getPrices } from '@/lib/prices'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('symbols') ?? ''
    const symbols = raw.split(',').map((s) => s.trim()).filter(Boolean)
    const prices = await getPrices(symbols)
    return NextResponse.json(prices)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
