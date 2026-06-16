import { buildCostSeries } from './performance'

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
