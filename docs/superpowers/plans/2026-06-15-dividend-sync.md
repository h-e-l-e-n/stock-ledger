# Dividend Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "同步股利" button to the dividend page that fetches dividend policy data from FinMind, computes actual received amounts from trade history, and writes new records to the `股利記錄` Google Sheet.

**Architecture:** `aggregateTrades` gains an optional `{ until }` date cutoff to snapshot positions at any date. A new `lib/dividends.js` exposes two pure functions: `fetchDividends` (FinMind API) and `computeReceivedDividends` (calculates amount per position). A POST route orchestrates the sync; a client button triggers it.

**Tech Stack:** Next.js App Router, FinMind `TaiwanStockDividend` dataset, `lib/sheets.js` (`getRows`, `appendRow`), Jest

---

## File Map

Modified:
- `lib/positions.js` — add optional `{ until }` param to `aggregateTrades`
- `lib/positions.test.js` — add `until` tests
- `app/dividends/page.js` — import and render `SyncDividendsButton`

New:
- `lib/dividends.js` — `fetchDividends`, `computeReceivedDividends`
- `lib/dividends.test.js` — unit tests for both functions
- `app/api/dividends/sync/route.js` — POST handler
- `components/sync-dividends-button.js` — client button component

---

## Context

`aggregateTrades(trades)` in `lib/positions.js` takes an array of trades (each with `date`, `type`, `symbol`, `name`, `fundSource`, `shares`, `amount`, `fee`) and returns current open positions grouped by `(symbol, fundSource)`.

`lib/sheets.js` exports `getRows(sheetName)` and `appendRow(sheetName, values)`.

`股利記錄` sheet columns: `日期`, `股票代號`, `股票名稱`, `實領金額`, `殖利率`

Run tests with: `npx jest`

---

## Task 1: `aggregateTrades` date cutoff

**Files:**
- Modify: `lib/positions.js`
- Modify: `lib/positions.test.js`

- [ ] **Step 1: Write the failing tests**

Add to `lib/positions.test.js` (after the existing `describe` block):

```js
describe('aggregateTrades with until cutoff', () => {
  test('excludes trades after the cutoff date', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-01-03', shares: 5,  amount: 600,  fee: 5  }),
    ], { until: '2026-01-02' })
    expect(result[0].shares).toBe(10)
  })

  test('includes trades on the cutoff date itself', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-01-02', shares: 5,  amount: 600,  fee: 5  }),
    ], { until: '2026-01-02' })
    expect(result[0].shares).toBe(15)
  })

  test('returns empty when all trades are after cutoff', () => {
    const result = aggregateTrades([
      t({ date: '2026-02-01', shares: 10, amount: 1000, fee: 10 }),
    ], { until: '2026-01-31' })
    expect(result).toHaveLength(0)
  })

  test('no cutoff → same behaviour as before', () => {
    const result = aggregateTrades([t()])
    expect(result[0].shares).toBe(10)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/positions.test.js
```

Expected: 4 new tests FAIL — `until` is not recognised

- [ ] **Step 3: Update `lib/positions.js`**

Replace the entire file:

```js
export function aggregateTrades(trades, { until } = {}) {
  const filtered = until ? trades.filter((t) => t.date <= until) : trades
  const sorted = filtered
    .map((t, i) => ({ ...t, _idx: i }))
    .sort((a, b) => a.date.localeCompare(b.date) || a._idx - b._idx)
  const groups = new Map()

  for (const trade of sorted) {
    const key = `${trade.symbol}|${trade.fundSource}`
    if (!groups.has(key)) {
      groups.set(key, { code: trade.symbol, name: trade.name, fundSource: trade.fundSource, shares: 0, totalCost: 0 })
    }
    const pos = groups.get(key)
    if (trade.name) pos.name = trade.name

    if (trade.type === '買入') {
      pos.shares += trade.shares
      pos.totalCost += trade.amount + trade.fee
    } else if (trade.type === '賣出') {
      const prevShares = pos.shares
      pos.shares -= trade.shares
      if (prevShares > 0) pos.totalCost = pos.totalCost * pos.shares / prevShares
    }
  }

  return [...groups.values()]
    .filter((p) => p.shares > 0)
    .map(({ code, name, fundSource, shares, totalCost }) => ({
      code,
      name,
      fundSource,
      shares,
      costPrice: +(totalCost / shares).toFixed(4),
    }))
}
```

- [ ] **Step 4: Run full test suite**

```bash
npx jest
```

Expected: all tests pass (previous 55 + 4 new = 59)

- [ ] **Step 5: Commit**

```bash
git add lib/positions.js lib/positions.test.js
git commit -m "feat: add optional until date cutoff to aggregateTrades"
```

---

## Task 2: `computeReceivedDividends`

**Files:**
- Create: `lib/dividends.js`
- Create: `lib/dividends.test.js`

`computeReceivedDividends(dividendRecords, trades)` takes:
- `dividendRecords`: `{ symbol, exDate, cashDividend, stockDividend }[]`
  - `cashDividend` and `stockDividend` are NT$ per share
- `trades`: same shape as `aggregateTrades` input (shares already in 股, not 張)

Returns `{ date, symbol, name, amount, yieldRate }[]` — one entry per dividend where the user held shares.

- [ ] **Step 1: Write the failing tests**

Create `lib/dividends.test.js`:

```js
import { computeReceivedDividends } from './dividends'

const trade = (overrides) => ({
  date: '2024-01-01',
  type: '買入',
  fundSource: '閒錢操作',
  symbol: '2330',
  name: '台積電',
  shares: 1000,
  amount: 1000000,
  fee: 0,
  ...overrides,
})

const div = (overrides) => ({
  symbol: '2330',
  exDate: '2024-06-15',
  cashDividend: 3,
  stockDividend: 0,
  ...overrides,
})

describe('computeReceivedDividends', () => {
  test('returns amount = shares × cashDividend for a held position', () => {
    const [result] = computeReceivedDividends([div()], [trade()])
    expect(result.amount).toBe(1000 * 3) // 3000
    expect(result.date).toBe('2024-06-15')
    expect(result.symbol).toBe('2330')
    expect(result.name).toBe('台積電')
  })

  test('includes stockDividend in amount', () => {
    const [result] = computeReceivedDividends(
      [div({ cashDividend: 3, stockDividend: 1 })],
      [trade()]
    )
    expect(result.amount).toBe(1000 * 4) // 4000
  })

  test('excludes dividend when stock not yet bought at exDate', () => {
    const result = computeReceivedDividends(
      [div({ exDate: '2023-12-31' })],
      [trade({ date: '2024-01-01' })]
    )
    expect(result).toHaveLength(0)
  })

  test('excludes dividend when position fully sold before exDate', () => {
    const result = computeReceivedDividends(
      [div({ exDate: '2024-06-15' })],
      [
        trade({ date: '2024-01-01', shares: 1000, amount: 1000000, fee: 0 }),
        trade({ date: '2024-03-01', type: '賣出', shares: 1000, amount: 1100000, fee: 0 }),
      ]
    )
    expect(result).toHaveLength(0)
  })

  test('uses shares held across all fundSources for the same symbol', () => {
    const [result] = computeReceivedDividends(
      [div()],
      [
        trade({ fundSource: '定期定額', shares: 500, amount: 500000, fee: 0 }),
        trade({ fundSource: '閒錢操作', shares: 300, amount: 300000, fee: 0 }),
      ]
    )
    expect(result.amount).toBe(800 * 3) // 2400
  })

  test('computes yieldRate as totalPerShare / costPrice × 100', () => {
    // costPrice = (1000000 + 0) / 1000 = 1000
    const [result] = computeReceivedDividends([div({ cashDividend: 30 })], [trade()])
    expect(result.yieldRate).toBeCloseTo(30 / 1000 * 100) // 3%
  })

  test('skips dividend records where both cashDividend and stockDividend are 0', () => {
    const result = computeReceivedDividends(
      [div({ cashDividend: 0, stockDividend: 0 })],
      [trade()]
    )
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/dividends.test.js
```

Expected: FAIL — `Cannot find module './dividends'`

- [ ] **Step 3: Create `lib/dividends.js` with `computeReceivedDividends`**

```js
import { aggregateTrades } from './positions'

export function computeReceivedDividends(dividendRecords, trades) {
  return dividendRecords
    .filter((d) => d.cashDividend + d.stockDividend > 0)
    .flatMap((d) => {
      const positions = aggregateTrades(trades, { until: d.exDate })
      const matching = positions.filter((p) => p.code === d.symbol)
      if (matching.length === 0) return []

      const totalShares = matching.reduce((s, p) => s + p.shares, 0)
      const avgCostPrice = matching.reduce((s, p) => s + p.costPrice * p.shares, 0) / totalShares
      const totalPerShare = d.cashDividend + d.stockDividend
      const amount = Math.round(totalShares * totalPerShare)
      const yieldRate = avgCostPrice > 0 ? +(totalPerShare / avgCostPrice * 100).toFixed(2) : 0
      const name = matching[0].name

      return [{ date: d.exDate, symbol: d.symbol, name, amount, yieldRate }]
    })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/dividends.test.js
```

Expected: 7 tests pass

- [ ] **Step 5: Run full test suite**

```bash
npx jest
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add lib/dividends.js lib/dividends.test.js
git commit -m "feat: add computeReceivedDividends to lib/dividends"
```

---

## Task 3: `fetchDividends`

**Files:**
- Modify: `lib/dividends.js`
- Modify: `lib/dividends.test.js`

`fetchDividends(symbols)` calls FinMind `TaiwanStockDividend` for each symbol (in parallel), parses the response, and returns a flat array of `{ symbol, exDate, cashDividend, stockDividend }`.

**Important:** Verify the exact FinMind field names by logging the raw API response in Step 3 before writing the parser.

- [ ] **Step 1: Write the failing test**

Add to `lib/dividends.test.js`:

```js
describe('parseDividendRecords', () => {
  test('maps FinMind response fields to internal shape', () => {
    const raw = [
      {
        stock_id: '2330',
        CashEarningsDistribution: 3.5,
        StockEarningsDistribution: 0,
        ExdividendDate: '2024-06-15',
      },
    ]
    const result = parseDividendRecords('2330', raw)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      symbol: '2330',
      exDate: '2024-06-15',
      cashDividend: 3.5,
      stockDividend: 0,
    })
  })

  test('skips records with empty exDate', () => {
    const raw = [
      {
        stock_id: '2330',
        CashEarningsDistribution: 3.5,
        StockEarningsDistribution: 0,
        ExdividendDate: '',
      },
    ]
    expect(parseDividendRecords('2330', raw)).toHaveLength(0)
  })

  test('returns empty array for null or empty input', () => {
    expect(parseDividendRecords('2330', null)).toHaveLength(0)
    expect(parseDividendRecords('2330', [])).toHaveLength(0)
  })
})
```

Also update the import line at the top of `lib/dividends.test.js`:

```js
import { computeReceivedDividends, parseDividendRecords } from './dividends'
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/dividends.test.js
```

Expected: 3 new tests FAIL — `parseDividendRecords` not exported

- [ ] **Step 3: Check the FinMind field names**

Before implementing, verify the exact field names by running this one-off command (requires `.env` with `FINMIND_TOKEN`):

```bash
node --env-file=.env -e "
const params = new URLSearchParams({ dataset: 'TaiwanStockDividend', data_id: '2330', token: process.env.FINMIND_TOKEN })
fetch('https://api.finmindtrade.com/api/v4/data?' + params)
  .then(r => r.json())
  .then(j => console.log(JSON.stringify(j.data?.[0], null, 2)))
"
```

If field names differ from `ExdividendDate`, `CashEarningsDistribution`, `StockEarningsDistribution` — update the test and implementation accordingly.

- [ ] **Step 4: Add `parseDividendRecords` and `fetchDividends` to `lib/dividends.js`**

Add to the bottom of `lib/dividends.js`:

```js
export function parseDividendRecords(symbol, records) {
  if (!records || records.length === 0) return []
  return records
    .filter((r) => r.ExdividendDate)
    .map((r) => ({
      symbol,
      exDate: r.ExdividendDate,
      cashDividend: Number(r.CashEarningsDistribution) || 0,
      stockDividend: Number(r.StockEarningsDistribution) || 0,
    }))
}

export async function fetchDividends(symbols) {
  if (!process.env.FINMIND_TOKEN) throw new Error('FINMIND_TOKEN is not set')
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const params = new URLSearchParams({
          dataset: 'TaiwanStockDividend',
          data_id: symbol,
          token: process.env.FINMIND_TOKEN,
        })
        const res = await fetch(`https://api.finmindtrade.com/api/v4/data?${params}`)
        if (!res.ok) return []
        const json = await res.json()
        return parseDividendRecords(symbol, json.data)
      } catch {
        return []
      }
    })
  )
  return entries.flat()
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest lib/dividends.test.js
```

Expected: all 10 tests pass

- [ ] **Step 6: Run full test suite**

```bash
npx jest
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add lib/dividends.js lib/dividends.test.js
git commit -m "feat: add fetchDividends and parseDividendRecords to lib/dividends"
```

---

## Task 4: `POST /api/dividends/sync`

**Files:**
- Create: `app/api/dividends/sync/route.js`

- [ ] **Step 1: Create the route**

```bash
mkdir -p app/api/dividends/sync
```

Create `app/api/dividends/sync/route.js`:

```js
import { NextResponse } from 'next/server'
import { getRows, appendRow } from '@/lib/sheets'
import { fetchDividends, computeReceivedDividends } from '@/lib/dividends'

export async function POST() {
  try {
    const tradeRows = await getRows('交易記錄')
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

    const symbols = [...new Set(trades.map((t) => t.symbol))]
    const dividendRecords = await fetchDividends(symbols)
    const computed = computeReceivedDividends(dividendRecords, trades)

    const existing = await getRows('股利記錄')
    const existingKeys = new Set(
      existing.map((r) => `${r['股票代號']}|${r['日期']}`)
    )

    const newRecords = computed.filter(
      (r) => !existingKeys.has(`${r.symbol}|${r.date}`)
    )

    for (const r of newRecords) {
      await appendRow('股利記錄', [r.date, r.symbol, r.name, r.amount, r.yieldRate])
    }

    return NextResponse.json({ added: newRecords.length })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Run full test suite to confirm no regressions**

```bash
npx jest
```

Expected: all tests still pass

- [ ] **Step 3: Commit**

```bash
git add app/api/dividends/sync/route.js
git commit -m "feat: add POST /api/dividends/sync route"
```

---

## Task 5: Button + wire into dividends page

**Files:**
- Create: `components/sync-dividends-button.js`
- Modify: `app/dividends/page.js`

- [ ] **Step 1: Create `components/sync-dividends-button.js`**

```js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SyncDividendsButton() {
  const [state, setState] = useState('idle') // idle | loading | done
  const [added, setAdded] = useState(0)
  const router = useRouter()

  async function handleSync() {
    setState('loading')
    try {
      const res = await fetch('/api/dividends/sync', { method: 'POST' })
      const json = await res.json()
      setAdded(json.added ?? 0)
      setState('done')
      router.refresh()
    } catch {
      setState('idle')
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={state === 'loading'}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
    >
      <svg
        className={`w-4 h-4 ${state === 'loading' ? 'animate-spin' : ''}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        aria-hidden="true"
      >
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      {state === 'loading' && '同步中...'}
      {state === 'done' && (added > 0 ? `已新增 ${added} 筆` : '已是最新')}
      {state === 'idle' && '同步股利'}
    </button>
  )
}
```

- [ ] **Step 2: Add button to `app/dividends/page.js`**

Add import after the existing imports:

```js
import SyncDividendsButton from '@/components/sync-dividends-button'
```

Replace the existing page header `<div>`:

```js
// current:
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">股利記錄</h1>
        <p className="text-gray-500 mt-2">歷年配息與殖利率統計</p>
      </div>

// replacement:
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">股利記錄</h1>
          <p className="text-gray-500 mt-2">歷年配息與殖利率統計</p>
        </div>
        <SyncDividendsButton />
      </div>
```

- [ ] **Step 3: Run full test suite**

```bash
npx jest
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add components/sync-dividends-button.js app/dividends/page.js
git commit -m "feat: add sync dividends button to dividend page"
```
