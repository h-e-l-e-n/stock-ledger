import { parseSheetRows } from './sheets.js'

describe('parseSheetRows', () => {
  test('returns empty array when values is empty', () => {
    expect(parseSheetRows([])).toEqual([])
    expect(parseSheetRows(null)).toEqual([])
  })

  test('returns empty array when only headers row exists', () => {
    expect(parseSheetRows([['日期', '類型', '股票代號']])).toEqual([])
  })

  test('maps rows to objects using header keys', () => {
    const values = [
      ['日期', '類型', '股票代號', '股票名稱'],
      ['2024-01-15', '買入', '2330', '台積電'],
      ['2024-02-01', '賣出', '0050', '元大台灣50'],
    ]
    expect(parseSheetRows(values)).toEqual([
      { '日期': '2024-01-15', '類型': '買入', '股票代號': '2330', '股票名稱': '台積電' },
      { '日期': '2024-02-01', '類型': '賣出', '股票代號': '0050', '股票名稱': '元大台灣50' },
    ])
  })

  test('fills missing columns with empty string', () => {
    const values = [
      ['日期', '類型', '備註'],
      ['2024-01-15', '買入'],
    ]
    expect(parseSheetRows(values)).toEqual([
      { '日期': '2024-01-15', '類型': '買入', '備註': '' },
    ])
  })
})
