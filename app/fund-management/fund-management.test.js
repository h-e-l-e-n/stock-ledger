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
