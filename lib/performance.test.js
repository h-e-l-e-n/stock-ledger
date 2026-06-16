import { buildCostSeries, computeRealizedPnl, computeWinRate } from './performance'

const t = (overrides) => ({
  date: '2026-01-01',
  type: '買入',
  fundSource: '閒錢操作',
  symbol: '2330',
  name: '台積電',
  shares: 10,
  amount: 1000,
  fee: 10,
  ...overrides,
})

describe('buildCostSeries', () => {
  test('empty trades → []', () => {
    expect(buildCostSeries([], new Date('2026-01-31'))).toEqual([])
  })

  test('single buy → one month entry with correct cost', () => {
    const trades = [t({ date: '2026-01-15', shares: 10, amount: 1000, fee: 10 })]
    const result = buildCostSeries(trades, new Date('2026-01-31'))
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ month: '2026-01', cost: 1010 })
  })

  test('buy in Jan, another in Feb → cost accumulates', () => {
    const trades = [
      t({ date: '2026-01-15', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-15', shares: 5,  amount: 500,  fee: 5  }),
    ]
    const result = buildCostSeries(trades, new Date('2026-02-28'))
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ month: '2026-01', cost: 1010 })
    expect(result[1]).toEqual({ month: '2026-02', cost: 1515 })
  })

  test('two symbols in same month → costs are summed', () => {
    const trades = [
      t({ date: '2026-01-10', symbol: '2330', shares: 10, amount: 1000, fee: 10 }), // costPrice 101
      { date: '2026-01-20', type: '買入', fundSource: '閒錢操作', symbol: '2317', name: '鴻海',
        shares: 5, amount: 500, fee: 5 }, // costPrice 101
    ]
    const result = buildCostSeries(trades, new Date('2026-01-31'))
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ month: '2026-01', cost: 1010 + 505 }) // 1515
  })

  test('sell in Feb reduces cost in Feb entry', () => {
    // Buy 10 shares: totalCost = 1010, costPrice = 101
    // Sell 5 shares in Feb: 5 shares remain, costPrice still 101
    // Feb cost = 5 * 101 = 505
    const trades = [
      t({ date: '2026-01-15', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-15', type: '賣出', shares: 5, amount: 505, fee: 5 }),
    ]
    const result = buildCostSeries(trades, new Date('2026-02-28'))
    expect(result[0]).toEqual({ month: '2026-01', cost: 1010 })
    expect(result[1]).toEqual({ month: '2026-02', cost: 505 })
  })

  test('months with no trades still appear (cost carried forward)', () => {
    const trades = [
      t({ date: '2026-01-15', shares: 10, amount: 1000, fee: 10 }),
    ]
    const result = buildCostSeries(trades, new Date('2026-03-31'))
    expect(result).toHaveLength(3)
    expect(result[1]).toEqual({ month: '2026-02', cost: 1010 })
    expect(result[2]).toEqual({ month: '2026-03', cost: 1010 })
  })
})

describe('computeRealizedPnl', () => {
  test('no sells → 0', () => {
    expect(computeRealizedPnl([t()])).toBe(0)
  })

  test('sell at profit → positive value', () => {
    // Buy 10 shares: totalCost 1010, costPrice 101/share
    // Sell 5 shares: proceeds = 600 - 5 = 595; cost basis = 5 * 101 = 505
    // PnL = 595 - 505 = 90
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-01', type: '賣出', shares: 5, amount: 600, fee: 5 }),
    ]
    expect(computeRealizedPnl(trades)).toBe(90)
  })

  test('sell at loss → negative value', () => {
    // costPrice 101/share
    // Sell 5 shares: proceeds = 400 - 5 = 395; cost = 5 * 101 = 505
    // PnL = 395 - 505 = -110
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-01', type: '賣出', shares: 5, amount: 400, fee: 5 }),
    ]
    expect(computeRealizedPnl(trades)).toBe(-110)
  })

  test('multiple sells → summed', () => {
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }), // costPrice 101
      t({ date: '2026-02-01', type: '賣出', shares: 3, amount: 360, fee: 3 }), // proceeds 357, cost 303, PnL +54
      t({ date: '2026-03-01', type: '賣出', shares: 3, amount: 240, fee: 3 }), // proceeds 237, cost 303, PnL -66
    ]
    // Total PnL = 54 + (-66) = -12
    expect(computeRealizedPnl(trades)).toBe(-12)
  })

  test('empty trades → 0', () => {
    expect(computeRealizedPnl([])).toBe(0)
  })

  test('sell with no matching prior buy → skipped (returns 0)', () => {
    const orphanSell = t({ date: '2026-01-15', type: '賣出', shares: 5, amount: 500, fee: 5 })
    expect(computeRealizedPnl([orphanSell])).toBe(0)
  })
})

describe('computeWinRate', () => {
  test('no sell trades → rate is null', () => {
    expect(computeWinRate([t()])).toEqual({ wins: 0, total: 0, rate: null })
  })

  test('one sell above cost price → 100%', () => {
    // costPrice = 101, sell.price = 120 → win
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-01', type: '賣出', shares: 5, price: 120, amount: 600, fee: 5 }),
    ]
    expect(computeWinRate(trades)).toEqual({ wins: 1, total: 1, rate: 100.0 })
  })

  test('one sell below cost price → 0%', () => {
    // costPrice = 101, sell.price = 80 → loss
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-01', type: '賣出', shares: 5, price: 80, amount: 400, fee: 5 }),
    ]
    expect(computeWinRate(trades)).toEqual({ wins: 0, total: 1, rate: 0.0 })
  })

  test('two sells, one win one loss → 50%', () => {
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }), // costPrice 101
      t({ date: '2026-02-01', type: '賣出', shares: 3, price: 120, amount: 360, fee: 3 }), // win
      t({ date: '2026-03-01', type: '賣出', shares: 3, price: 80,  amount: 240, fee: 3 }), // loss
    ]
    expect(computeWinRate(trades)).toEqual({ wins: 1, total: 2, rate: 50.0 })
  })
})
