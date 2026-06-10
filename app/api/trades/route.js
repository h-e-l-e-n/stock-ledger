// app/api/trades/route.js
import { NextResponse } from 'next/server'
import { getRows, appendRow } from '@/lib/sheets'

export function parseTrade(row, index) {
  return {
    id: index + 1,
    date: row['日期'],
    type: row['類型'],
    fundSource: row['資金來源'],
    symbol: row['股票代號'],
    name: row['股票名稱'],
    shares: Number(row['股數']),
    price: Number(row['價格']),
    amount: Number(row['金額']),
    fee: Number(row['手續費']),
  }
}

export async function GET() {
  const rows = await getRows('交易記錄')
  return NextResponse.json(rows.map(parseTrade))
}

export async function POST(request) {
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
}
