import { getRows, appendRow } from '@/lib/sheets'
import { fetchDividends, computeReceivedDividends } from '@/lib/dividends'

export async function POST() {
  if (!process.env.FINMIND_TOKEN) {
    return Response.json({ error: 'FINMIND_TOKEN is not set' }, { status: 500 })
  }

  try {
    const tradeRows = await getRows('交易記錄')
    const trades = tradeRows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']) * 1000,
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))

    const symbols = [...new Set(trades.map((t) => t.symbol))]
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

    return Response.json({ added: newRecords.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
