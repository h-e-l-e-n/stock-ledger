import { google } from 'googleapis'
import { parseSheetRows, getRows, appendRow, updateRow, clearSheetsCache } from './sheets.js'

jest.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: jest.fn(() => ({})) },
    sheets: jest.fn(),
  },
}))

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

describe('sheets cache', () => {
  let mockGet, mockAppend, mockUpdate

  beforeEach(() => {
    clearSheetsCache()
    mockGet = jest.fn().mockResolvedValue({
      data: { values: [['日期', '類型'], ['2024-01-01', '買入']] },
    })
    mockAppend = jest.fn().mockResolvedValue({})
    mockUpdate = jest.fn().mockResolvedValue({})
    google.sheets.mockReturnValue({
      spreadsheets: { values: { get: mockGet, append: mockAppend, update: mockUpdate } },
    })
  })

  test('second getRows call returns cached result without hitting the API', async () => {
    await getRows('交易記錄')
    await getRows('交易記錄')
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  test('cache is keyed by sheet name — different sheets hit the API independently', async () => {
    await getRows('交易記錄')
    await getRows('股利記錄')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  test('appendRow clears cache so next getRows hits the API again', async () => {
    await getRows('交易記錄')
    await appendRow('交易記錄', ['2024-01-02', '賣出'])
    await getRows('交易記錄')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  test('appendRow only clears cache for its own sheet', async () => {
    await getRows('交易記錄')
    await getRows('股利記錄')
    await appendRow('交易記錄', ['2024-01-02', '賣出'])
    await getRows('交易記錄')   // re-fetched: cache was cleared
    await getRows('股利記錄')   // still cached: no extra API call
    expect(mockGet).toHaveBeenCalledTimes(3)
  })

  test('updateRow clears cache so next getRows hits the API again', async () => {
    await getRows('交易記錄')
    await updateRow('交易記錄', 0, ['2024-01-01', '買入'])
    await getRows('交易記錄')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })
})
