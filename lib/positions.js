export function aggregateTrades(trades, { until } = {}) {
  const filtered = until ? trades.filter((t) => t.date <= until) : trades
  const sorted = filtered
    .map((t, i) => ({ ...t, _idx: i }))
    .sort((a, b) => a.date.localeCompare(b.date) || a._idx - b._idx)
  const groups = new Map()

  for (const trade of sorted) {
    const key = `${trade.symbol}|${trade.fundSource}`
    if (!groups.has(key)) {
      groups.set(key, { code: trade.symbol, name: trade.name, fundSource: trade.fundSource, shares: 0, totalCost: 0 })
    }
    const pos = groups.get(key)
    if (trade.name) pos.name = trade.name

    if (trade.type === '買入') {
      pos.shares += trade.shares
      pos.totalCost += trade.amount + trade.fee
    } else if (trade.type === '賣出') {
      const prevShares = pos.shares
      pos.shares -= trade.shares
      if (prevShares > 0) pos.totalCost = pos.totalCost * pos.shares / prevShares
    }
  }

  return [...groups.values()]
    .filter((p) => p.shares > 0)
    .map(({ code, name, fundSource, shares, totalCost }) => ({
      code,
      name,
      fundSource,
      shares,
      costPrice: +(totalCost / shares).toFixed(4),
    }))
}
