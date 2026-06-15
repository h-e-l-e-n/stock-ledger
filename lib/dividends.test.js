import { computeReceivedDividends } from './dividends'

const trade = (overrides) => ({
  date: '2024-01-01',
  type: '買入',
  fundSource: '閒錢操作',
  symbol: '2330',
  name: '台積電',
  shares: 1000,
  amount: 1000000,
  fee: 0,
  ...overrides,
})

const div = (overrides) => ({
  symbol: '2330',
  exDate: '2024-06-15',
  cashDividend: 3,
  stockDividend: 0,
  ...overrides,
})

describe('computeReceivedDividends', () => {
  test('returns amount = shares × cashDividend for a held position', () => {
    const [result] = computeReceivedDividends([div()], [trade()])
    expect(result.amount).toBe(1000 * 3) // 3000
    expect(result.date).toBe('2024-06-15')
    expect(result.symbol).toBe('2330')
    expect(result.name).toBe('台積電')
  })

  test('includes stockDividend in amount', () => {
    const [result] = computeReceivedDividends(
      [div({ cashDividend: 3, stockDividend: 1 })],
      [trade()]
    )
    expect(result.amount).toBe(1000 * 4) // 4000
  })

  test('excludes dividend when stock not yet bought at exDate', () => {
    const result = computeReceivedDividends(
      [div({ exDate: '2023-12-31' })],
      [trade({ date: '2024-01-01' })]
    )
    expect(result).toHaveLength(0)
  })

  test('excludes dividend when position fully sold before exDate', () => {
    const result = computeReceivedDividends(
      [div({ exDate: '2024-06-15' })],
      [
        trade({ date: '2024-01-01', shares: 1000, amount: 1000000, fee: 0 }),
        trade({ date: '2024-03-01', type: '賣出', shares: 1000, amount: 1100000, fee: 0 }),
      ]
    )
    expect(result).toHaveLength(0)
  })

  test('uses shares held across all fundSources for the same symbol', () => {
    const [result] = computeReceivedDividends(
      [div()],
      [
        trade({ fundSource: '定期定額', shares: 500, amount: 500000, fee: 0 }),
        trade({ fundSource: '閒錢操作', shares: 300, amount: 300000, fee: 0 }),
      ]
    )
    expect(result.amount).toBe(800 * 3) // 2400
  })

  test('computes yieldRate as totalPerShare / costPrice × 100', () => {
    // costPrice = (1000000 + 0) / 1000 = 1000
    const [result] = computeReceivedDividends([div({ cashDividend: 30 })], [trade()])
    expect(result.yieldRate).toBeCloseTo(30 / 1000 * 100) // 3%
  })

  test('skips dividend records where both cashDividend and stockDividend are 0', () => {
    const result = computeReceivedDividends(
      [div({ cashDividend: 0, stockDividend: 0 })],
      [trade()]
    )
    expect(result).toHaveLength(0)
  })
})
