import { aggregateTrades } from './positions'

export function computeReceivedDividends(dividendRecords, trades) {
  return dividendRecords
    .filter((d) => d.cashDividend + d.stockDividend > 0)
    .flatMap((d) => {
      const tradesBeforeCutoff = trades.filter((t) => t.date < d.exDate)
      const positions = aggregateTrades(tradesBeforeCutoff)
      const matching = positions.filter((p) => p.code === d.symbol)
      if (matching.length === 0) return []

      const totalShares = matching.reduce((s, p) => s + p.shares, 0)
      const avgCostPrice = matching.reduce((s, p) => s + p.costPrice * p.shares, 0) / totalShares
      const totalPerShare = d.cashDividend + d.stockDividend
      const amount = Math.round(totalShares * totalPerShare)
      const yieldRate = avgCostPrice > 0 ? +(totalPerShare / avgCostPrice * 100).toFixed(2) : 0
      const name = matching[0].name

      return [{ date: d.exDate, symbol: d.symbol, name, amount, yieldRate }]
    })
}

export function parseDividendRecords(symbol, records) {
  if (!records || records.length === 0) return []
  const out = []
  for (const r of records) {
    const cashDate = r.CashExDividendTradingDate
    const stockDate = r.StockExDividendTradingDate
    const cashDiv = Number(r.CashEarningsDistribution) || 0
    const stockDiv = Number(r.StockEarningsDistribution) || 0

    if (cashDate && stockDate && cashDate !== stockDate) {
      if (cashDiv > 0) out.push({ symbol, exDate: cashDate, cashDividend: cashDiv, stockDividend: 0 })
      if (stockDiv > 0) out.push({ symbol, exDate: stockDate, cashDividend: 0, stockDividend: stockDiv })
    } else {
      const exDate = cashDate || stockDate
      if (exDate) out.push({ symbol, exDate, cashDividend: cashDiv, stockDividend: stockDiv })
    }
  }
  return out
}

export async function fetchDividends(symbols) {
  if (!process.env.FINMIND_TOKEN) throw new Error('FINMIND_TOKEN is not set')
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      const params = new URLSearchParams({
        dataset: 'TaiwanStockDividend',
        data_id: symbol,
        start_date: '2020-01-01',
        token: process.env.FINMIND_TOKEN,
      })
      try {
        const res = await fetch(`https://api.finmindtrade.com/api/v4/data?${params}`)
        if (res.status === 401 || res.status === 403) throw new Error(`FinMind auth failed: ${res.status}`)
        if (!res.ok) return []
        const json = await res.json()
        return parseDividendRecords(symbol, json.data)
      } catch (err) {
        if (err.message.startsWith('FinMind auth failed')) throw err
        return []
      }
    })
  )
  return entries.flat()
}
