import { GET, POST, DELETE } from './route.js'
import { getRows, appendRow, deleteRow } from '@/lib/sheets'

jest.mock('@/lib/sheets', () => ({
  getRows: jest.fn(),
  appendRow: jest.fn(),
  deleteRow: jest.fn(),
}))

const mockRows = [
  { '股票代號': '0050', '股票名稱': '元大台灣50', '目標價': '200', '停損價': '180', '開啟通知': 'FALSE' },
  { '股票代號': '2330', '股票名稱': '台積電', '目標價': '1000', '停損價': '900', '開啟通知': 'FALSE' },
]

beforeEach(() => {
  jest.clearAllMocks()
})

describe('DELETE /api/watchlist', () => {
  test('deletes the matching row and returns ok', async () => {
    getRows.mockResolvedValue(mockRows)
    deleteRow.mockResolvedValue({})

    const req = new Request('http://localhost/api/watchlist?symbol=2330')
    const res = await DELETE(req)
    const body = await res.json()

    expect(deleteRow).toHaveBeenCalledWith('觀察清單', 1)
    expect(body).toEqual({ ok: true })
  })

  test('returns 404 when symbol is not in the list', async () => {
    getRows.mockResolvedValue(mockRows)

    const req = new Request('http://localhost/api/watchlist?symbol=9999')
    const res = await DELETE(req)

    expect(res.status).toBe(404)
    expect(deleteRow).not.toHaveBeenCalled()
  })

  test('returns 400 when symbol query param is missing', async () => {
    const req = new Request('http://localhost/api/watchlist')
    const res = await DELETE(req)

    expect(res.status).toBe(400)
    expect(getRows).not.toHaveBeenCalled()
    expect(deleteRow).not.toHaveBeenCalled()
  })

  test('returns 500 when getRows throws', async () => {
    getRows.mockRejectedValue(new Error('sheets down'))
    const req = new Request('http://localhost/api/watchlist?symbol=0050')
    const res = await DELETE(req)
    expect(res.status).toBe(500)
  })
})
