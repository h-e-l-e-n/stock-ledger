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
  return records
    .map((r) => ({
      exDate: r.CashExDividendTradingDate || r.StockExDividendTradingDate,
      cashDividend: Number(r.CashEarningsDistribution) || 0,
      stockDividend: Number(r.StockEarningsDistribution) || 0,
    }))
    .filter((r) => r.exDate)
    .map((r) => ({ symbol, ...r }))
}

export async function fetchDividends(symbols) {
  if (!process.env.FINMIND_TOKEN) throw new Error('FINMIND_TOKEN is not set')
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const params = new URLSearchParams({
          dataset: 'TaiwanStockDividend',
          data_id: symbol,
          start_date: '2020-01-01',
          token: process.env.FINMIND_TOKEN,
        })
        const res = await fetch(`https://api.finmindtrade.com/api/v4/data?${params}`)
        if (!res.ok) return []
        const json = await res.json()
        return parseDividendRecords(symbol, json.data)
      } catch {
        return []
      }
    })
  )
  return entries.flat()
}
