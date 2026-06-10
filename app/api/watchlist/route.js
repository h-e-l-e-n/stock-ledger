// app/api/watchlist/route.js
import { NextResponse } from 'next/server'
import { getRows, appendRow } from '@/lib/sheets'

export function parseWatchlistItem(row) {
  return {
    symbol: row['股票代號'],
    name: row['股票名稱'],
    targetPrice: Number(row['目標價']),
    stopLoss: Number(row['停損價']),
    alertEnabled: row['開啟通知'] === 'TRUE',
    currentPrice: 0,
    change: 0,
    changePercent: 0,
  }
}

export async function GET() {
  try {
    const rows = await getRows('觀察清單')
    return NextResponse.json(rows.map(parseWatchlistItem))
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    await appendRow('觀察清單', [
      body.symbol,
      body.name,
      body.targetPrice,
      body.stopLoss,
      'FALSE',
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
