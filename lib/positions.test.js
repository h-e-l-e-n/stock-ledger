import { aggregateTrades } from './positions'

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

describe('aggregateTrades', () => {
  test('single buy → correct code, name, fundSource, shares, costPrice', () => {
    const [pos] = aggregateTrades([t()])
    expect(pos.code).toBe('2330')
    expect(pos.name).toBe('台積電')
    expect(pos.fundSource).toBe('閒錢操作')
    expect(pos.shares).toBe(10)
    expect(pos.costPrice).toBeCloseTo((1000 + 10) / 10) // 101
  })

  test('two buys same symbol+fundSource → weighted average cost', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-01-02', shares: 5,  amount: 600,  fee: 5  }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].shares).toBe(15)
    // totalCost = 1010 + 605 = 1615; costPrice = 1615/15
    expect(result[0].costPrice).toBeCloseTo(1615 / 15)
  })

  test('buy then sell → remaining shares, costPrice unchanged', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-01-02', type: '賣出', shares: 3, amount: 330, fee: 5 }),
    ])
    expect(result[0].shares).toBe(7)
    // totalCost after sell = 1010 * 7/10 = 707; costPrice = 707/7 = 101 (unchanged)
    expect(result[0].costPrice).toBeCloseTo(1010 / 10)
  })

  test('fully sold → excluded from output', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-01-02', type: '賣出', shares: 10, amount: 1100, fee: 5 }),
    ])
    expect(result).toHaveLength(0)
  })

  test('same symbol, different fundSource → two separate rows', () => {
    const result = aggregateTrades([
      t({ fundSource: '定期定額' }),
      t({ fundSource: '閒錢操作' }),
    ])
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.fundSource).sort()).toEqual(['定期定額', '閒錢操作'])
  })

  test('fee included in cost basis', () => {
    const [pos] = aggregateTrades([t({ shares: 10, amount: 1000, fee: 50 })])
    expect(pos.costPrice).toBeCloseTo((1000 + 50) / 10) // 105
  })

  test('processes trades in date order regardless of input order', () => {
    const result = aggregateTrades([
      // sell is first in array but dated later — must be applied after the buy
      t({ date: '2026-01-02', type: '賣出', shares: 3, amount: 330, fee: 5 }),
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
    ])
    expect(result[0].shares).toBe(7)
  })

  test('preserves name when a later trade has empty name', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', name: '台積電' }),
      t({ date: '2026-01-02', name: '' }),
    ])
    expect(result[0].name).toBe('台積電')
  })

  test('oversell → position excluded from output', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 5, amount: 500, fee: 5 }),
      t({ date: '2026-01-02', type: '賣出', shares: 10, amount: 1000, fee: 5 }),
    ])
    expect(result).toHaveLength(0)
  })
})

describe('aggregateTrades with until cutoff', () => {
  test('excludes trades after the cutoff date', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-01-03', shares: 5,  amount: 600,  fee: 5  }),
    ], { until: '2026-01-02' })
    expect(result[0].shares).toBe(10)
  })

  test('includes trades on the cutoff date itself', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-01-02', shares: 5,  amount: 600,  fee: 5  }),
    ], { until: '2026-01-02' })
    expect(result[0].shares).toBe(15)
  })

  test('returns empty when all trades are after cutoff', () => {
    const result = aggregateTrades([
      t({ date: '2026-02-01', shares: 10, amount: 1000, fee: 10 }),
    ], { until: '2026-01-31' })
    expect(result).toHaveLength(0)
  })

  test('no cutoff → same behaviour as before', () => {
    const result = aggregateTrades([t()])
    expect(result[0].shares).toBe(10)
  })
})
