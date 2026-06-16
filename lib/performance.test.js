import { buildCostSeries, computeRealizedPnl, computeWinRate, computeAnnualizedReturn } from './performance'

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

  test('sell with no matching prior buy → excluded from total', () => {
    const orphanSell = t({ date: '2026-01-15', type: '賣出', shares: 5, price: 120, amount: 600, fee: 5 })
    expect(computeWinRate([orphanSell])).toEqual({ wins: 0, total: 0, rate: null })
  })

  test('break-even sell (price equals costPrice) → counted as loss', () => {
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }), // costPrice 101
      t({ date: '2026-02-01', type: '賣出', shares: 5, price: 101, amount: 505, fee: 5 }),
    ]
    expect(computeWinRate(trades)).toEqual({ wins: 0, total: 1, rate: 0.0 })
  })
})

describe('computeAnnualizedReturn', () => {
  test('empty trades → null', () => {
    expect(computeAnnualizedReturn([], [], {}, new Date('2026-06-16'))).toBeNull()
  })

  test('holding days 0 (first trade is today) → null', () => {
    const today = new Date('2026-01-01')
    const trades = [t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 })]
    expect(computeAnnualizedReturn(trades, [], {}, today)).toBeNull()
  })

  test('100% total return over exactly 365 days → ~100% annualized', () => {
    // Buy 10 shares: totalCost = 1010, costPrice = 101/share
    // 365 days later, price = 202 (double)
    // unrealized PnL = (202 - 101) * 10 = 1010
    // totalReturn = 1010 / 1010 = 100%
    // annualized = (1 + 1)^(365/365) - 1 = 1.0 → 100%
    const trades = [t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 })]
    const positions = [{ code: '2330', fundSource: '閒錢操作', shares: 10, costPrice: 101 }]
    const prices = { '2330': { price: 202 } }
    const today = new Date('2027-01-01')
    const result = computeAnnualizedReturn(trades, positions, prices, today)
    expect(result).toBeCloseTo(100.0, 0)
  })

  test('positions with no price → excluded from unrealized PnL', () => {
    // Only realized PnL counts; unrealized not included if price is null
    // Buy 10 @ cost 101, sell 5 at 120 → realized PnL = (600-5) - 5*101 = 595 - 505 = 90
    // Remaining 5 shares have no current price → unrealized = 0
    // totalReturn = 90 / 1010; holdingDays = 365
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-01', type: '賣出', shares: 5, price: 120, amount: 600, fee: 5 }),
    ]
    const positions = [{ code: '2330', fundSource: '閒錢操作', shares: 5, costPrice: 101 }]
    const prices = {}
    const today = new Date('2027-01-01')
    const result = computeAnnualizedReturn(trades, positions, prices, today)
    const expectedReturn = 90 / 1010
    const expected = (Math.pow(1 + expectedReturn, 365 / 365) - 1) * 100
    expect(result).toBeCloseTo(expected, 0)
  })

  test('no buy trades (totalCost = 0) → null', () => {
    const trades = [t({ date: '2026-01-01', type: '賣出', shares: 5, amount: 500, fee: 5 })]
    expect(computeAnnualizedReturn(trades, [], {}, new Date('2027-01-01'))).toBeNull()
  })

  test('null positions → treated as empty, uses only realizedPnl', () => {
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-06-01', type: '賣出', shares: 5, price: 120, amount: 600, fee: 5 }),
    ]
    // Should not throw even with null positions
    expect(() => computeAnnualizedReturn(trades, null, {}, new Date('2027-01-01'))).not.toThrow()
  })

  test('non-365 holding period: 100% return over 730 days → ~41.4% annualized', () => {
    // totalCost = 1010, unrealized PnL = (202 - 101) * 10 = 1010, total return = 100%
    // annualized over 730 days = (1 + 1)^(365/730) - 1 = 2^0.5 - 1 ≈ 0.4142 → 41.4%
    const trades = [t({ date: '2025-01-01', shares: 10, amount: 1000, fee: 10 })]
    const positions = [{ code: '2330', fundSource: '閒錢操作', shares: 10, costPrice: 101 }]
    const prices = { '2330': { price: 202 } }
    const today = new Date('2027-01-01') // ~730 days later
    const result = computeAnnualizedReturn(trades, positions, prices, today)
    // (1 + 1)^(365/730) - 1 = sqrt(2) - 1 ≈ 41.4%
    expect(result).toBeCloseTo(41.4, 0)
  })
})
