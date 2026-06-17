# Sheets In-Memory Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache Google Sheets API responses in a module-level Map so repeated reads within the same server process skip the network, with precise cache invalidation on every write.

**Architecture:** A single `Map<sheetName, rows[]>` lives at module scope in `lib/sheets.js`. `getRows` checks the Map before calling the Sheets API; `appendRow` and `updateRow` delete the relevant entry after a successful write. A `clearSheetsCache()` export is provided for test teardown only.

**Tech Stack:** Node.js built-ins only — no new dependencies.

---

### Task 1: Add cache to `lib/sheets.js` (TDD)

**Files:**
- Modify: `lib/sheets.js`
- Modify: `lib/sheets.test.js`

---

- [ ] **Step 1: Update `lib/sheets.test.js` with googleapis mock and cache tests**

Make the following three changes to `lib/sheets.test.js`:

**1) Replace the existing import line at the top:**

```js
// Before:
import { parseSheetRows } from './sheets.js'

// After:
import { google } from 'googleapis'
import { parseSheetRows, getRows, appendRow, updateRow, clearSheetsCache } from './sheets.js'

jest.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: jest.fn(() => ({})) },
    sheets: jest.fn(),
  },
}))
```

(`jest.mock` must be at the top of the file — Jest hoists it before imports run.)

**2) Append this describe block at the end of the file:**

```js
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
```

---

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npm test -- lib/sheets.test.js
```

Expected: the `parseSheetRows` tests pass, the new `sheets cache` tests fail with errors like:
- `TypeError: clearSheetsCache is not a function`
- `TypeError: google.sheets.mockReturnValue is not a function` (if jest.mock isn't hoisted yet)

If you see those failures, the tests are wired up correctly.

---

- [ ] **Step 3: Implement the cache in `lib/sheets.js`**

Replace the contents of `lib/sheets.js` with:

```js
import { google } from 'googleapis'

export function parseSheetRows(values) {
  if (!values || values.length < 1) return []
  const [headers, ...rows] = values
  if (rows.length === 0) return []
  return rows.map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  )
}

const sheetsCache = new Map()

export function clearSheetsCache() {
  sheetsCache.clear()
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export async function getRows(sheetName) {
  if (sheetsCache.has(sheetName)) return sheetsCache.get(sheetName)
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: sheetName,
  })
  const rows = parseSheetRows(res.data.values)
  sheetsCache.set(sheetName, rows)
  return rows
}

export async function appendRow(sheetName, values) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: sheetName,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
  sheetsCache.delete(sheetName)
}

export async function updateRow(sheetName, rowIndex, values) {
  const sheets = getSheetsClient()
  const range = `${sheetName}!A${rowIndex + 2}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
  sheetsCache.delete(sheetName)
}
```

---

- [ ] **Step 4: Run the tests — verify they all pass**

```bash
npm test -- lib/sheets.test.js
```

Expected output:
```
PASS lib/sheets.test.js
  parseSheetRows
    ✓ returns empty array when values is empty
    ✓ returns empty array when only headers row exists
    ✓ maps rows to objects using header keys
    ✓ fills missing columns with empty string
  sheets cache
    ✓ second getRows call returns cached result without hitting the API
    ✓ cache is keyed by sheet name — different sheets hit the API independently
    ✓ appendRow clears cache so next getRows hits the API again
    ✓ appendRow only clears cache for its own sheet
    ✓ updateRow clears cache so next getRows hits the API again
```

---

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npm test
```

Expected: all tests pass. If any other test file imports from `lib/sheets.js` and breaks, check whether the `jest.mock('googleapis')` is missing from that file — but since no other test currently calls `getRows`/`appendRow`/`updateRow` directly, this should be clean.

---

- [ ] **Step 6: Commit**

```bash
git add lib/sheets.js lib/sheets.test.js
git commit -m "perf: add in-memory cache to sheets getRows with write invalidation"
```
