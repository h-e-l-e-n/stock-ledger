# Watchlist Remove Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a remove button to each row in the watchlist page that immediately deletes the item from Google Sheets.

**Architecture:** Three focused changes: (1) add `deleteRow` to `lib/sheets.js` using the Sheets `batchUpdate` + `deleteDimension` API; (2) add a `DELETE` handler to `app/api/watchlist/route.js` that accepts `?symbol=`; (3) add a trash icon button per row in `app/watchlist/page.js`.

**Tech Stack:** Google Sheets API v4 (`batchUpdate`), Next.js App Router route handlers, React state.

---

### Task 1: Add `deleteRow` to `lib/sheets.js`

**Files:**
- Modify: `lib/sheets.js`
- Modify: `lib/sheets.test.js`

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block at the bottom of `lib/sheets.test.js`. Import `deleteRow` in the import line at the top.

Change the top import line from:
```js
import { parseSheetRows, getRows, appendRow, updateRow, clearSheetsCache } from './sheets.js'
```
to:
```js
import { parseSheetRows, getRows, appendRow, updateRow, deleteRow, clearSheetsCache } from './sheets.js'
```

Then add at the bottom of the file:
```js
describe('deleteRow', () => {
  let mockBatchUpdate, mockSpreadsheetGet

  beforeEach(() => {
    clearSheetsCache()
    mockSpreadsheetGet = jest.fn().mockResolvedValue({
      data: {
        sheets: [
          { properties: { title: '觀察清單', sheetId: 42 } },
        ],
      },
    })
    mockBatchUpdate = jest.fn().mockResolvedValue({})
    google.sheets.mockReturnValue({
      spreadsheets: {
        values: { get: jest.fn(), append: jest.fn(), update: jest.fn() },
        get: mockSpreadsheetGet,
        batchUpdate: mockBatchUpdate,
      },
    })
  })

  test('calls batchUpdate with correct deleteDimension range', async () => {
    await deleteRow('觀察清單', 2)
    expect(mockBatchUpdate).toHaveBeenCalledWith({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: 42,
              dimension: 'ROWS',
              startIndex: 3,
              endIndex: 4,
            },
          },
        }],
      },
    })
  })

  test('clears cache after deletion so next getRows hits the API', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: { values: [['股票代號'], ['2330']] },
    })
    google.sheets.mockReturnValue({
      spreadsheets: {
        values: { get: mockGet, append: jest.fn(), update: jest.fn() },
        get: mockSpreadsheetGet,
        batchUpdate: mockBatchUpdate,
      },
    })
    await getRows('觀察清單')
    await deleteRow('觀察清單', 0)
    await getRows('觀察清單')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest lib/sheets.test.js --no-coverage
```

Expected: two new tests fail with `deleteRow is not a function` (or similar).

- [ ] **Step 3: Implement `deleteRow` in `lib/sheets.js`**

Add after the `updateRow` export at the bottom of `lib/sheets.js`:

```js
export async function deleteRow(sheetName, rowIndex) {
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
  })
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex + 1,
            endIndex: rowIndex + 2,
          },
        },
      }],
    },
  })
  sheetsCache.delete(sheetName)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest lib/sheets.test.js --no-coverage
```

Expected: all tests pass including the two new `deleteRow` tests.

- [ ] **Step 5: Commit**

```bash
git add lib/sheets.js lib/sheets.test.js
git commit -m "feat: add deleteRow to lib/sheets"
```

---

### Task 2: Add `DELETE` handler to watchlist route

**Files:**
- Modify: `app/api/watchlist/route.js`
- Create: `app/api/watchlist/route.test.js`

- [ ] **Step 1: Write the failing tests**

Create `app/api/watchlist/route.test.js`:

```js
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
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest app/api/watchlist/route.test.js --no-coverage
```

Expected: three tests fail — `DELETE` is not exported from the route.

- [ ] **Step 3: Add `deleteRow` import and `DELETE` handler to the route**

In `app/api/watchlist/route.js`, change the import line from:
```js
import { getRows, appendRow } from '@/lib/sheets'
```
to:
```js
import { getRows, appendRow, deleteRow } from '@/lib/sheets'
```

Then add at the bottom of the file:
```js
export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  try {
    const rows = await getRows('觀察清單')
    const index = rows.findIndex(r => r['股票代號'] === symbol)
    if (index === -1) return NextResponse.json({ error: 'not found' }, { status: 404 })
    await deleteRow('觀察清單', index)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest app/api/watchlist/route.test.js --no-coverage
```

Expected: all three tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/watchlist/route.js app/api/watchlist/route.test.js
git commit -m "feat: add DELETE handler to watchlist API"
```

---

### Task 3: Add remove button to watchlist UI

**Files:**
- Modify: `app/watchlist/page.js`

No unit tests — this is a UI-only change with no exported pure functions.

- [ ] **Step 1: Add `handleRemove` function**

In `app/watchlist/page.js`, add this function after the `handleAdd` function (around line 72, before the `return`):

```js
  const handleRemove = async (symbol) => {
    await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: 'DELETE' })
    loadWatchlist()
  }
```

- [ ] **Step 2: Add "操作" column header**

In the `<thead>` section (around line 134), the last `{['提示'].map(...)}` renders one header cell. Change the entire two `map` blocks for right-aligned and centered headers so the last cell group becomes `['提示', '操作']`:

Replace:
```jsx
                {['提示'].map((h) => (
                  <th key={h} className="text-center py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
```
with:
```jsx
                {['提示'].map((h) => (
                  <th key={h} className="text-center py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
                <th className="py-4 px-6"></th>
```

- [ ] **Step 3: Add remove button to each data row**

In the `<tbody>` section, after the closing `</td>` of the 提示 cell (around line 178), add a new `<td>` with the trash button. The new cell goes after the `{nearTarget && ...}{nearStopLoss && ...}` 提示 cell:

```jsx
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleRemove(item.symbol)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="移除"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </td>
```

- [ ] **Step 4: Update the empty-state `colSpan`**

Near the bottom of the `<tbody>` (around line 183), the empty row has `colSpan={7}`. Change it to `colSpan={8}`:

Replace:
```jsx
              {watchlist.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">尚無觀察清單</td></tr>
              )}
```
with:
```jsx
              {watchlist.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">尚無觀察清單</td></tr>
              )}
```

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/watchlist/page.js
git commit -m "feat: add remove button to watchlist rows"
```
