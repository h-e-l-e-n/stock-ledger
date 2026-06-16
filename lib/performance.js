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
    const lastDay = new Date(y, m + 1, 0).getDate()
    const until = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`
    const positions = aggregateTrades(trades, { until })
    const cost = positions.reduce((s, p) => s + p.costPrice * p.shares, 0)
    result.push({ month: monthStr, cost: Math.round(cost) })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return result
}

function findPositionAtSell(trades, sell) {
  const prior = trades.filter((t) => t !== sell && t.date <= sell.date)
  const positions = aggregateTrades(prior)
  return positions.find((p) => p.code === sell.symbol && p.fundSource === sell.fundSource) ?? null
}

export function computeRealizedPnl(trades) {
  const sells = trades.filter((t) => t.type === '賣出')
  let total = 0
  for (const sell of sells) {
    const pos = findPositionAtSell(trades, sell)
    if (!pos) continue
    const proceeds = sell.amount - sell.fee
    const costOfSold = pos.costPrice * sell.shares
    total += proceeds - costOfSold
  }
  return Math.round(total)
}

export function computeWinRate(trades) {
  const sells = trades.filter((t) => t.type === '賣出')
  if (sells.length === 0) return { wins: 0, total: 0, rate: null }
  let wins = 0
  let matched = 0
  for (const sell of sells) {
    const pos = findPositionAtSell(trades, sell)
    if (!pos) continue
    if (sell.price == null) continue
    matched++
    if (sell.price > pos.costPrice) wins++
  }
  if (matched === 0) return { wins: 0, total: 0, rate: null }
  return { wins, total: matched, rate: +(wins / matched * 100).toFixed(1) }
}

export function computeAnnualizedReturn(trades, positions, prices, today = new Date()) {
  if (!trades || trades.length === 0) return null
  const safePositions = positions ?? []
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  const firstDate = new Date(sorted[0].date)
  const holdingDays = Math.round((today - firstDate) / (1000 * 60 * 60 * 24))
  if (holdingDays === 0) return null

  const totalCost = trades
    .filter((t) => t.type === '買入')
    .reduce((s, t) => s + t.amount + t.fee, 0)
  if (totalCost === 0) return null

  const realizedPnl = computeRealizedPnl(trades)
  const unrealizedPnl = safePositions
    .filter((p) => prices[p.code]?.price != null)
    .reduce((s, p) => s + (prices[p.code].price - p.costPrice) * p.shares, 0)

  const totalReturn = (realizedPnl + unrealizedPnl) / totalCost
  const annualized = Math.pow(1 + totalReturn, 365 / holdingDays) - 1
  if (!Number.isFinite(annualized)) return null
  return +(annualized * 100).toFixed(1)
}
