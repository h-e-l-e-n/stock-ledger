import { sortRows } from './positions-table'

const rows = [
  { code: '2330', name: '台積電', shares: 100, costPrice: 520,  currentPrice: 580,  pnlAmount: 6000,  pnlPct: 11.54 },
  { code: '2317', name: '鴻海',   shares: 200, costPrice: 108,  currentPrice: 105,  pnlAmount: -600,  pnlPct: -2.78 },
  { code: '2454', name: '聯發科', shares: 50,  costPrice: 1050, currentPrice: 1120, pnlAmount: 3500,  pnlPct: 6.67  },
]

describe('sortRows', () => {
  test('sortKey null 時回傳原陣列', () => {
    expect(sortRows(rows, null, 'asc')).toBe(rows)
  })

  test('數值欄位 asc 排序', () => {
    const result = sortRows(rows, 'pnlAmount', 'asc')
    expect(result[0].code).toBe('2317')  // -600
    expect(result[1].code).toBe('2454')  // 3500
    expect(result[2].code).toBe('2330')  // 6000
  })

  test('數值欄位 desc 排序', () => {
    const result = sortRows(rows, 'pnlAmount', 'desc')
    expect(result[0].code).toBe('2330')  // 6000
    expect(result[1].code).toBe('2454')  // 3500
    expect(result[2].code).toBe('2317')  // -600
  })

  test('字串欄位 (code) asc 排序', () => {
    const result = sortRows(rows, 'code', 'asc')
    expect(result[0].code).toBe('2317')
    expect(result[1].code).toBe('2330')
    expect(result[2].code).toBe('2454')
  })

  test('字串欄位 (code) desc 排序', () => {
    const result = sortRows(rows, 'code', 'desc')
    expect(result[0].code).toBe('2454')
    expect(result[1].code).toBe('2330')
    expect(result[2].code).toBe('2317')
  })

  test('不改變原陣列', () => {
    const original = [rows[0].code, rows[1].code, rows[2].code]
    const result = sortRows(rows, 'pnlAmount', 'asc')
    expect(result).not.toBe(rows)
    expect(rows[0].code).toBe(original[0])
    expect(rows[1].code).toBe(original[1])
    expect(rows[2].code).toBe(original[2])
  })
})
