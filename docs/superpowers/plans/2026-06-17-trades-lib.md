# Trades Parsing Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralise all Google Sheets trade-row parsing into `lib/trades.js` to eliminate the 5-way duplication of the same mapping code.

**Architecture:** Create `lib/trades.js` with two functions — `parseTradeRow` (internal calculations, shares × 1000) and `parseApiTrade` (client-facing API, 張數 as-is). Then update the 5 pages that do inline mapping to use `parseTradeRow`, and replace the local `parseTrade` in `app/api/trades/route.js` with an import of `parseApiTrade`.

**Tech Stack:** Vanilla JS, Jest for tests.

---

## File Map

| File | Action |
|---|---|
| `lib/trades.js` | **Create** — two exported parser functions |
| `lib/trades.test.js` | **Create** — unit tests for both functions |
| `app/page.js` | **Modify** — replace inline mapping (lines 48–57) |
| `app/positions/page.js` | **Modify** — replace inline mapping (lines 13–22) |
| `app/api/dividends/sync/route.js` | **Modify** — replace inline mapping (lines 12–21) |
| `app/fund-management/page.js` | **Modify** — replace inline mapping (lines 101–110) only |
| `app/performance/page.js` | **Modify** — replace inline mapping (lines 23–33) |
| `app/api/trades/route.js` | **Modify** — delete local `parseTrade`, import `parseApiTrade` |

---

### Task 1: Create `lib/trades.js` with tests (TDD)

**Files:**
- Create: `lib/trades.js`
- Create: `lib/trades.test.js`

---

- [ ] **Step 1: Write failing tests in `lib/trades.test.js`**

Create `/Users/helen/Desktop/stock-ledger/lib/trades.test.js` with:

```js
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
```

---

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- lib/trades.test.js
```

Expected: FAIL — `Cannot find module './trades.js'`

---

- [ ] **Step 3: Create `lib/trades.js`**

Create `/Users/helen/Desktop/stock-ledger/lib/trades.js` with:

```js
export function parseTradeRow(row) {
  return {
    date:       row['日期'],
    type:       row['類型'],
    fundSource: row['資金來源'],
    symbol:     row['股票代號'],
    name:       row['股票名稱'],
    shares:     Number(row['股數']) * 1000,
    price:      Number(row['價格']) || null,
    amount:     Number(row['金額']),
    fee:        Number(row['手續費']),
  }
}

export function parseApiTrade(row, index) {
  return {
    id:         index + 1,
    date:       row['日期'],
    type:       row['類型'],
    fundSource: row['資金來源'],
    symbol:     row['股票代號'],
    name:       row['股票名稱'],
    shares:     Number(row['股數']),
    price:      Number(row['價格']),
    amount:     Number(row['金額']),
    fee:        Number(row['手續費']),
  }
}
```

---

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- lib/trades.test.js
```

Expected:
```
PASS lib/trades.test.js
  parseTradeRow
    ✓ maps all fields correctly
    ✓ multiplies 股數 by 1000 to convert 張 to share count
    ✓ returns null for price when cell is empty string
    ✓ returns null for price when cell is missing
  parseApiTrade
    ✓ maps all fields correctly
    ✓ does NOT multiply 股數 by 1000
    ✓ sets id = index + 1
    ✓ returns 0 for price when cell is empty (Number coercion)
```

---

- [ ] **Step 5: Commit**

```bash
git add lib/trades.js lib/trades.test.js
git commit -m "feat: add lib/trades.js with parseTradeRow and parseApiTrade"
```

---

### Task 2: Update all 6 callsites

**Files:**
- Modify: `app/page.js`
- Modify: `app/positions/page.js`
- Modify: `app/api/dividends/sync/route.js`
- Modify: `app/fund-management/page.js`
- Modify: `app/performance/page.js`
- Modify: `app/api/trades/route.js`

---

- [ ] **Step 1: Update `app/page.js`**

Add the import and replace the inline mapping. The file currently starts with:

```js
import { getRows } from '@/lib/sheets'
import { getPrices } from '@/lib/prices'
import { aggregateTrades } from '@/lib/positions'
```

Change to:

```js
import { getRows } from '@/lib/sheets'
import { getPrices } from '@/lib/prices'
import { aggregateTrades } from '@/lib/positions'
import { parseTradeRow } from '@/lib/trades'
```

Then replace the inline mapping block (currently lines 48–57):

```js
    // Before:
    const trades = tradeRows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']) * 1000,
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))

    // After:
    const trades = tradeRows.map(parseTradeRow)
```

**⚠ DO NOT replace** the second `recentTrades` mapping (lines ~72–78) — that is a different 5-field shape for UI display only and must stay as-is.

---

- [ ] **Step 2: Update `app/positions/page.js`**

Add import after the existing imports:

```js
import { parseTradeRow } from '@/lib/trades'
```

Replace the inline mapping (currently lines 13–22):

```js
    // Before:
    const trades = rows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']) * 1000,
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))

    // After:
    const trades = rows.map(parseTradeRow)
```

---

- [ ] **Step 3: Update `app/api/dividends/sync/route.js`**

Add import after the existing imports:

```js
import { parseTradeRow } from '@/lib/trades'
```

Replace the inline mapping (currently lines 12–21):

```js
    // Before:
    const trades = tradeRows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']) * 1000,
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))

    // After:
    const trades = tradeRows.map(parseTradeRow)
```

---

- [ ] **Step 4: Update `app/fund-management/page.js`**

Add import after the existing imports:

```js
import { parseTradeRow } from '@/lib/trades'
```

Replace only the trade object mapping block (currently lines 101–110). **Leave `computeMonthlyInvestment` (lines 42–58) completely untouched** — it accesses raw row fields directly for month grouping.

```js
    // Before (inside FundManagement async function):
    const trades = rows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']) * 1000,
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))

    // After:
    const trades = rows.map(parseTradeRow)
```

---

- [ ] **Step 5: Update `app/performance/page.js`**

Add import after the existing imports:

```js
import { parseTradeRow } from '@/lib/trades'
```

Replace the inline mapping (currently lines 23–33). Note: the current inline mapping already includes `price` — `parseTradeRow` also includes `price`, so behaviour is preserved.

```js
    // Before:
    const trades = rows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']) * 1000,
      price: Number(row['價格']) || null,
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))

    // After:
    const trades = rows.map(parseTradeRow)
```

---

- [ ] **Step 6: Update `app/api/trades/route.js`**

Replace the local `parseTrade` definition with an import from `@/lib/trades`, and rename the call site.

Current file top:

```js
// app/api/trades/route.js
import { NextResponse } from 'next/server'
import { getRows, appendRow } from '@/lib/sheets'

export function parseTrade(row, index) {
  return {
    id: index + 1,
    date: row['日期'],
    type: row['類型'],
    fundSource: row['資金來源'],
    symbol: row['股票代號'],
    name: row['股票名稱'],
    shares: Number(row['股數']),
    price: Number(row['價格']),
    amount: Number(row['金額']),
    fee: Number(row['手續費']),
  }
}
```

Replace with:

```js
// app/api/trades/route.js
import { NextResponse } from 'next/server'
import { getRows, appendRow } from '@/lib/sheets'
import { parseApiTrade } from '@/lib/trades'
```

Then in the GET handler, change `rows.map(parseTrade)` to `rows.map(parseApiTrade)`:

```js
export async function GET() {
  try {
    const rows = await getRows('交易記錄')
    return NextResponse.json(rows.map(parseApiTrade))
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

- [ ] **Step 7: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. No new failures — no existing test imports `parseTrade` from the route, so renaming it does not break any test.

---

- [ ] **Step 8: Commit**

```bash
git add app/page.js app/positions/page.js app/api/dividends/sync/route.js \
        app/fund-management/page.js app/performance/page.js app/api/trades/route.js
git commit -m "refactor: replace inline trade row mappings with lib/trades parseTradeRow"
```
