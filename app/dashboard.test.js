import { computeDashboardStats, toDonutPositions } from './page'

describe('computeDashboardStats', () => {
  const priced = [
    { code: '2330', name: '台積電', shares: 10, costPrice: 500, currentPrice: 600, change: 10,  fundSource: '定期定額' },
    { code: '2454', name: '聯發科', shares: 5,  costPrice: 800, currentPrice: 900, change: -5,  fundSource: '貸款資金' },
  ]
  const unpriced = [
    { code: '2317', name: '鴻海',   shares: 20, costPrice: 100, currentPrice: null, change: null, fundSource: '閒錢操作' },
  ]

  test('netAssets uses currentPrice for priced positions, costPrice for unpriced', () => {
    const { netAssets } = computeDashboardStats([...priced, ...unpriced])
    // priced:   10*600 + 5*900  = 10500
    // unpriced: 20*100          = 2000
    expect(netAssets).toBe(12500)
  })

  test('todayPnl sums change × shares for priced positions', () => {
    const { todayPnl } = computeDashboardStats(priced)
    // 10*10 + 5*(-5) = 100 - 25 = 75
    expect(todayPnl).toBe(75)
  })

  test('todayPct is todayPnl / prevValue × 100', () => {
    const { todayPct } = computeDashboardStats(priced)
    // prevValue: 10*(600-10) + 5*(900+5) = 5900 + 4525 = 10425
    // todayPct:  75 / 10425 * 100
    expect(todayPct).toBeCloseTo(75 / 10425 * 100)
  })

  test('todayPnl and todayPct are null when no positions have prices', () => {
    const { todayPnl, todayPct } = computeDashboardStats(unpriced)
    expect(todayPnl).toBeNull()
    expect(todayPct).toBeNull()
  })

  test('returns zero netAssets and null pnl for empty positions', () => {
    const { netAssets, todayPnl, todayPct } = computeDashboardStats([])
    expect(netAssets).toBe(0)
    expect(todayPnl).toBeNull()
    expect(todayPct).toBeNull()
  })
})

describe('toDonutPositions', () => {
  test('uses currentPrice × shares when price available', () => {
    const positions = [
      { code: '2330', name: '台積電', shares: 10, costPrice: 500, currentPrice: 600, change: 10, fundSource: '定期定額' },
    ]
    const result = toDonutPositions(positions)
    expect(result[0].value).toBe(6000)
    expect(result[0].color).toBe('#3b82f6')
  })

  test('falls back to costPrice × shares when currentPrice is null', () => {
    const positions = [
      { code: '2317', name: '鴻海', shares: 20, costPrice: 100, currentPrice: null, change: null, fundSource: '閒錢操作' },
    ]
    const result = toDonutPositions(positions)
    expect(result[0].value).toBe(2000)
    expect(result[0].color).toBe('#10b981')
  })

  test('assigns gray (#94a3b8) for unknown or blank fundSource', () => {
    const positions = [
      { code: '2330', name: '台積電', shares: 10, costPrice: 500, currentPrice: null, change: null, fundSource: '' },
    ]
    const result = toDonutPositions(positions)
    expect(result[0].color).toBe('#94a3b8')
  })

  test('excludes positions with zero value', () => {
    const positions = [
      { code: '2330', name: '台積電', shares: 0,  costPrice: 0,   currentPrice: null, change: null, fundSource: '定期定額' },
      { code: '2454', name: '聯發科', shares: 5,  costPrice: 100, currentPrice: null, change: null, fundSource: '貸款資金' },
    ]
    const result = toDonutPositions(positions)
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('2454')
  })
})
