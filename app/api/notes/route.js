import { NextResponse } from 'next/server'
import { getRows, appendRow } from '@/lib/sheets'

export function parseNote(row, index) {
  return {
    id: index + 1,
    date: row['日期'],
    symbol: row['股票代號'],
    name: row['股票名稱'],
    strategy: row['策略'],
    buyReason: row['買入理由'],
    sellReason: row['賣出理由'] || undefined,
    expectedResult: row['預期結果'],
    actualResult: row['實際結果'] || undefined,
    review: row['事後檢討'] || undefined,
    status: row['狀態'],
  }
}

export async function GET() {
  try {
    const rows = await getRows('交易筆記')
    return NextResponse.json(rows.map(parseNote))
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    await appendRow('交易筆記', [
      body.date,
      body.symbol,
      body.name,
      body.strategy,
      body.buyReason,
      body.sellReason || '',
      body.expectedResult || '',
      body.actualResult || '',
      body.review || '',
      body.status,
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
