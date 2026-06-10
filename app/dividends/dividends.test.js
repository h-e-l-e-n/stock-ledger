import { aggregateDividends } from './page'

const records = [
  { date: '2024-07-01', symbol: '2330', name: '台積電', amount: 3200, yield: 2.8 },
  { date: '2024-08-01', symbol: '2882', name: '國泰金', amount: 1800, yield: 5.5 },
  { date: '2025-07-01', symbol: '2330', name: '台積電', amount: 3500, yield: 3.0 },
]

test('aggregates by year', () => {
  const { yearlyDividends } = aggregateDividends(records)
  expect(yearlyDividends).toEqual([
    { year: '2024', amount: 5000 },
    { year: '2025', amount: 3500 },
  ])
})

test('aggregates by stock', () => {
  const { stockDividends } = aggregateDividends(records)
  const tsmc = stockDividends.find((s) => s.symbol === '2330')
  expect(tsmc.totalDividends).toBe(6700)
  expect(tsmc.avgYield).toBeCloseTo(2.9)
})

test('returns empty arrays for empty input', () => {
  const { yearlyDividends, stockDividends } = aggregateDividends([])
  expect(yearlyDividends).toEqual([])
  expect(stockDividends).toEqual([])
})
