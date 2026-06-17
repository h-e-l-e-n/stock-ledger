import { parseTradeRow, parseApiTrade } from './trades.js'

const sampleRow = {
  '日期': '2024-01-15',
  '類型': '買入',
  '資金來源': '閒錢操作',
  '股票代號': '2330',
  '股票名稱': '台積電',
  '股數': '2',
  '價格': '600',
  '金額': '1200000',
  '手續費': '1000',
}

describe('parseTradeRow', () => {
  test('maps all fields correctly', () => {
    expect(parseTradeRow(sampleRow)).toEqual({
      date: '2024-01-15',
      type: '買入',
      fundSource: '閒錢操作',
      symbol: '2330',
      name: '台積電',
      shares: 2000,
      price: 600,
      amount: 1200000,
      fee: 1000,
    })
  })

  test('multiplies 股數 by 1000 to convert 張 to share count', () => {
    expect(parseTradeRow({ ...sampleRow, '股數': '5' }).shares).toBe(5000)
  })

  test('returns null for price when cell is empty string', () => {
    expect(parseTradeRow({ ...sampleRow, '價格': '' }).price).toBeNull()
  })

  test('returns null for price when cell is missing', () => {
    const { '價格': _, ...rowWithoutPrice } = sampleRow
    expect(parseTradeRow(rowWithoutPrice).price).toBeNull()
  })
})

describe('parseApiTrade', () => {
  test('maps all fields correctly', () => {
    expect(parseApiTrade(sampleRow, 0)).toEqual({
      id: 1,
      date: '2024-01-15',
      type: '買入',
      fundSource: '閒錢操作',
      symbol: '2330',
      name: '台積電',
      shares: 2,
      price: 600,
      amount: 1200000,
      fee: 1000,
    })
  })

  test('does NOT multiply 股數 by 1000', () => {
    expect(parseApiTrade({ ...sampleRow, '股數': '3' }, 0).shares).toBe(3)
  })

  test('sets id = index + 1', () => {
    expect(parseApiTrade(sampleRow, 0).id).toBe(1)
    expect(parseApiTrade(sampleRow, 4).id).toBe(5)
  })

  test('returns 0 for price when cell is empty (Number coercion)', () => {
    expect(parseApiTrade({ ...sampleRow, '價格': '' }, 0).price).toBe(0)
  })
})
