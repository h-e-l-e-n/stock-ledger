import { getCacheKey, parsePriceRecords } from './prices'

describe('getCacheKey', () => {
  test('returns open key before 13:30 Taiwan time', () => {
    // 05:00 UTC = 13:00 Taiwan
    expect(getCacheKey(new Date('2026-06-12T05:00:00Z'))).toBe('2026-06-12-open')
  })

  test('returns close key at exactly 13:30 Taiwan time', () => {
    // 05:30 UTC = 13:30 Taiwan
    expect(getCacheKey(new Date('2026-06-12T05:30:00Z'))).toBe('2026-06-12-close')
  })

  test('returns close key after 13:30 Taiwan time', () => {
    // 08:00 UTC = 16:00 Taiwan
    expect(getCacheKey(new Date('2026-06-12T08:00:00Z'))).toBe('2026-06-12-close')
  })

  test('uses Taiwan calendar date, not UTC date', () => {
    // 16:00 UTC on June 11 = 00:00 Taiwan on June 12
    expect(getCacheKey(new Date('2026-06-11T16:00:00Z'))).toBe('2026-06-12-open')
  })
})

describe('parsePriceRecords', () => {
  const records = [
    { date: '2026-06-11', close: 980 },
    { date: '2026-06-12', close: 990 },
  ]

  test('returns price from most recent close', () => {
    expect(parsePriceRecords(records).price).toBe(990)
  })

  test('calculates positive change and changePercent', () => {
    const { change, changePercent } = parsePriceRecords(records)
    expect(change).toBe(10)
    expect(changePercent).toBeCloseTo(1.02)
  })

  test('calculates negative change and changePercent', () => {
    const declining = [
      { date: '2026-06-11', close: 1000 },
      { date: '2026-06-12', close: 980 },
    ]
    const { change, changePercent } = parsePriceRecords(declining)
    expect(change).toBe(-20)
    expect(changePercent).toBeCloseTo(-2)
  })

  test('returns null for fewer than 2 records', () => {
    expect(parsePriceRecords([{ date: '2026-06-12', close: 990 }])).toBeNull()
    expect(parsePriceRecords([])).toBeNull()
    expect(parsePriceRecords(null)).toBeNull()
  })

  test('sorts records by date before computing', () => {
    const unsorted = [
      { date: '2026-06-12', close: 990 },
      { date: '2026-06-11', close: 980 },
    ]
    const result = parsePriceRecords(unsorted)
    expect(result.price).toBe(990)
    expect(result.change).toBe(10)
  })
})
