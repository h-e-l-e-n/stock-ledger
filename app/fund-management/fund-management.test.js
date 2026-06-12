import { groupByFundSource } from './page'

const positions = [
  { fundSource: '定期定額', shares: 100, costPrice: 520 },
  { fundSource: '定期定額', shares: 50,  costPrice: 42  },
  { fundSource: '貸款資金', shares: 200, costPrice: 108 },
]

test('groups positions by fund source and sums cost', () => {
  const result = groupByFundSource(positions)
  expect(result['定期定額'].cost).toBe(100 * 520 + 50 * 42)
  expect(result['貸款資金'].cost).toBe(200 * 108)
})

test('returns zero cost for missing fund source', () => {
  const result = groupByFundSource(positions)
  expect(result['閒錢操作']).toBeUndefined()
})

test('ignores positions with blank fundSource', () => {
  const withBlank = [
    { fundSource: '定期定額', shares: 100, costPrice: 520 },
    { fundSource: '',        shares: 50,  costPrice: 100 },
  ]
  const result = groupByFundSource(withBlank)
  expect(result['定期定額'].cost).toBe(100 * 520)
  expect(result['']).toBeUndefined()
})

test('uses currentPrice when prices map provided', () => {
  const withCode = [
    { fundSource: '定期定額', code: '2330', shares: 100, costPrice: 520 },
    { fundSource: '貸款資金', code: '2882', shares: 200, costPrice: 108 },
  ]
  const prices = { '2330': { price: 600 }, '2882': { price: 120 } }
  const result = groupByFundSource(withCode, prices)
  expect(result['定期定額'].cost).toBe(52000)
  expect(result['定期定額'].totalAsset).toBe(60000)
  expect(result['貸款資金'].cost).toBe(21600)
  expect(result['貸款資金'].totalAsset).toBe(24000)
})

test('falls back to cost when price unavailable', () => {
  const withCode = [
    { fundSource: '定期定額', code: '2330', shares: 100, costPrice: 520 },
  ]
  const result = groupByFundSource(withCode, {})
  expect(result['定期定額'].totalAsset).toBe(52000)
})
