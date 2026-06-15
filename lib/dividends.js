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
