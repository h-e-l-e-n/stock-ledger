import { aggregateTrades } from './positions'

export function buildCostSeries(trades, today = new Date()) {
  if (!trades || trades.length === 0) return []
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  const first = new Date(sorted[0].date)
  const result = []
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1)
  const endYear = today.getFullYear()
  const endMonth = today.getMonth()

  while (
    cursor.getFullYear() < endYear ||
    (cursor.getFullYear() === endYear && cursor.getMonth() <= endMonth)
  ) {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const until = new Date(y, m + 1, 0).toISOString().slice(0, 10)
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`
    const positions = aggregateTrades(trades, { until })
    const cost = positions.reduce((s, p) => s + p.costPrice * p.shares, 0)
    result.push({ month: monthStr, cost: Math.round(cost) })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return result
}
