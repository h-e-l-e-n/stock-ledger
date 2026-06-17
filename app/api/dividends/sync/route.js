import { NextResponse } from 'next/server'
import { getRows, appendRow } from '@/lib/sheets'
import { fetchDividends, computeReceivedDividends } from '@/lib/dividends'
import { parseTradeRow } from '@/lib/trades'

export async function POST() {
  if (!process.env.FINMIND_TOKEN) {
    return NextResponse.json({ error: 'FINMIND_TOKEN is not set' }, { status: 500 })
  }

  try {
    const tradeRows = await getRows('交易記錄')
    const trades = tradeRows.map(parseTradeRow)

    const symbols = [...new Set(trades.filter((t) => t.symbol).map((t) => t.symbol))]
    const dividendRecords = await fetchDividends(symbols)
    const computed = computeReceivedDividends(dividendRecords, trades)

    const existing = await getRows('股利記錄')
    const existingKeys = new Set(
      existing.map((r) => `${r['股票代號']}|${r['日期']}`)
    )

    const newRecords = computed.filter(
      (r) => !existingKeys.has(`${r.symbol}|${r.date}`)
    )

    for (const r of newRecords) {
      await appendRow('股利記錄', [r.date, r.symbol, r.name, r.amount, r.yieldRate])
    }

    return NextResponse.json({ added: newRecords.length })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
