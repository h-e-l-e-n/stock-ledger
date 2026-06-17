// app/api/trades/route.js
import { NextResponse } from 'next/server'
import { getRows, appendRow } from '@/lib/sheets'
import { parseApiTrade } from '@/lib/trades'

export async function GET() {
  try {
    const rows = await getRows('交易記錄')
    return NextResponse.json(rows.map(parseApiTrade))
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    await appendRow('交易記錄', [
      body.date,
      body.type,
      body.fundSource,
      body.symbol,
      body.name,
      body.shares,
      body.price,
      body.amount,
      body.fee,
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
