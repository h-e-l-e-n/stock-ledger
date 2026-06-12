# FinMind Price Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch real daily stock prices from FinMind and surface them on positions, fund management, and watchlist pages.

**Architecture:** A new `lib/prices.js` exports `getPrices(symbols)` with an in-memory two-window-per-day cache (盤中/盤後 split at 13:30 Taiwan time). Server pages import `getPrices` directly; the watchlist client component calls a new `GET /api/prices` route that delegates to the same function. Pure helper functions (`getCacheKey`, `parsePriceRecords`) are exported for unit testing.

**Tech Stack:** Next.js App Router, FinMind REST API (`TaiwanStockPrice` dataset), `FINMIND_TOKEN` env var (already in `.env`), Jest

---

## File Map

New files:
- `lib/prices.js` — cache + FinMind fetch + exported pure helpers
- `lib/prices.test.js` — unit tests for pure helpers
- `app/api/prices/route.js` — GET handler for client-side price lookups

Modified files:
- `app/positions/page.js` — call `getPrices`, fill `currentPrice`, show real 總損益
- `app/fund-management/page.js` — extend `groupByFundSource` to accept prices, add `code` field, show profit/profitRate in cards
- `app/fund-management/fund-management.test.js` — add tests for prices parameter
- `app/watchlist/page.js` — fetch `/api/prices` after loading watchlist, guard null price renders

---

## Context

`lib/sheets.js` exports `getRows(sheetName)`. Existing server pages use `export const dynamic = 'force-dynamic'` and call `getRows` in try-catch. `FINMIND_TOKEN` is in `.env`. Current `app/api/finmind/route.js` is a proxy that will not be touched.

FinMind API call structure:
```
GET https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=2330&start_date=2026-06-07&token=<TOKEN>
```

Response shape:
```json
{
  "data": [
    { "stock_id": "2330", "date": "2026-06-09", "open": 980, "max": 995, "min": 978, "close": 985 },
    { "stock_id": "2330", "date": "2026-06-10", "open": 986, "max": 998, "min": 983, "close": 990 }
  ]
}
```

Run tests with: `npx jest`

---

## Task 1: `lib/prices.js` — Price Fetching and Cache

**Files:**
- Create: `lib/prices.js`
- Create: `lib/prices.test.js`

- [ ] **Step 1: Write the failing tests**

Create `lib/prices.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/prices.test.js
```

Expected: FAIL — `Cannot find module './prices'`

- [ ] **Step 3: Implement `lib/prices.js`**

```js
let cache = { key: '', data: {} }

export function getCacheKey(now = new Date()) {
  const TAIWAN_OFFSET_MS = 8 * 60 * 60 * 1000
  const taiwanTime = new Date(now.getTime() + TAIWAN_OFFSET_MS)
  const date = taiwanTime.toISOString().slice(0, 10)
  const hours = taiwanTime.getUTCHours()
  const minutes = taiwanTime.getUTCMinutes()
  const isPastClose = hours > 13 || (hours === 13 && minutes >= 30)
  return `${date}-${isPastClose ? 'close' : 'open'}`
}

export function parsePriceRecords(records) {
  if (!records || records.length < 2) return null
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))
  const prev = sorted[sorted.length - 2]
  const last = sorted[sorted.length - 1]
  const change = +(last.close - prev.close).toFixed(2)
  const changePercent = +(change / prev.close * 100).toFixed(2)
  return { price: last.close, change, changePercent }
}

async function fetchSymbolPrice(symbol) {
  const startDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const params = new URLSearchParams({
    dataset: 'TaiwanStockPrice',
    data_id: symbol,
    start_date: startDate,
    token: process.env.FINMIND_TOKEN,
  })
  const res = await fetch(`https://api.finmindtrade.com/api/v4/data?${params}`)
  const json = await res.json()
  return parsePriceRecords(json.data)
}

export async function getPrices(symbols) {
  if (!symbols || symbols.length === 0) return {}
  const key = getCacheKey()
  if (cache.key === key) return cache.data
  const entries = await Promise.all(
    symbols.map(async (s) => {
      try {
        return [s, await fetchSymbolPrice(s)]
      } catch {
        return [s, null]
      }
    })
  )
  cache = { key, data: Object.fromEntries(entries) }
  return cache.data
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/prices.test.js
```

Expected: 9 tests pass

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
npx jest
```

Expected: all existing tests pass + 9 new

- [ ] **Step 6: Commit**

```bash
git add lib/prices.js lib/prices.test.js
git commit -m "feat: add lib/prices.js with FinMind fetch and daily cache"
```

---

## Task 2: `app/api/prices/route.js` — Prices API Route

**Files:**
- Create: `app/api/prices/route.js`

- [ ] **Step 1: Implement the route**

```js
import { NextResponse } from 'next/server'
import { getPrices } from '@/lib/prices'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('symbols') ?? ''
    const symbols = raw.split(',').map((s) => s.trim()).filter(Boolean)
    const prices = await getPrices(symbols)
    return NextResponse.json(prices)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Run tests to confirm no regressions**

```bash
npx jest
```

Expected: all tests pass (no new tests needed — route is a thin wrapper)

- [ ] **Step 3: Commit**

```bash
git add app/api/prices/route.js
git commit -m "feat: add GET /api/prices route for client-side price lookups"
```

---

## Task 3: `app/positions/page.js` — Wire Real Prices

**Files:**
- Modify: `app/positions/page.js`

- [ ] **Step 1: Replace the entire file**

```js
import { getRows } from '@/lib/sheets'
import { getPrices } from '@/lib/prices'
import StatCard from '@/components/dashboard/stat-card'
import PositionsTable from '@/components/positions/positions-table'

export const dynamic = 'force-dynamic'

export default async function PositionsPage() {
  let positions = []
  try {
    const rows = await getRows('持倉')
    const rawPositions = rows.map((row) => ({
      code: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']),
      costPrice: Number(row['成本價']),
    }))

    const symbols = [...new Set(rawPositions.map((p) => p.code))]
    const prices = symbols.length > 0 ? await getPrices(symbols) : {}

    positions = rawPositions.map((p) => ({
      ...p,
      currentPrice: prices[p.code]?.price ?? null,
    }))
  } catch (err) {
    console.error('Failed to load positions:', err.message)
  }

  const totalCost = positions.reduce((s, p) => s + p.costPrice * p.shares, 0)

  const pricedPositions = positions.filter((p) => p.currentPrice != null)
  const totalPnl = pricedPositions.length > 0
    ? pricedPositions.reduce((s, p) => s + (p.currentPrice - p.costPrice) * p.shares, 0)
    : null

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">持倉清單</h1>
        <p className="text-sm text-gray-500 mt-1">目前持有的股票投資組合</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <StatCard label="持倉成本" value={`NT$ ${Math.round(totalCost).toLocaleString()}`} />
        <StatCard
          label="總損益"
          value={totalPnl != null ? `NT$ ${Math.round(totalPnl).toLocaleString()}` : '—'}
        />
        <StatCard label="持股檔數" value={`${positions.length}`} />
      </div>

      <PositionsTable positions={positions} />
    </main>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npx jest
```

Expected: all tests pass (positions page has no unit tests; existing table tests still pass)

- [ ] **Step 3: Commit**

```bash
git add app/positions/page.js
git commit -m "feat: wire positions page to real stock prices via getPrices"
```

---

## Task 4: `app/fund-management/page.js` — Real Asset Values

**Files:**
- Modify: `app/fund-management/page.js`
- Modify: `app/fund-management/fund-management.test.js`

- [ ] **Step 1: Add new tests for prices parameter**

Append to `app/fund-management/fund-management.test.js` (keep existing 3 tests, add 2 more):

```js
test('uses currentPrice when prices map provided', () => {
  const withCode = [
    { fundSource: '定期定額', code: '2330', shares: 100, costPrice: 520 },
    { fundSource: '貸款資金', code: '2882', shares: 200, costPrice: 108 },
  ]
  const prices = { '2330': { price: 600 }, '2882': { price: 120 } }
  const result = groupByFundSource(withCode, prices)
  expect(result['定期定額'].cost).toBe(52000)
  expect(result['定期定額'].totalAsset).toBe(60000)
  expect(result['貸款資金'].cost).toBe(21600)
  expect(result['貸款資金'].totalAsset).toBe(24000)
})

test('falls back to cost when price unavailable', () => {
  const withCode = [
    { fundSource: '定期定額', code: '2330', shares: 100, costPrice: 520 },
  ]
  const result = groupByFundSource(withCode, {})
  expect(result['定期定額'].totalAsset).toBe(52000)
})
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx jest fund-management
```

Expected: FAIL — `groupByFundSource` doesn't accept `prices` yet

- [ ] **Step 3: Update `groupByFundSource` in `app/fund-management/page.js`**

Replace the existing `groupByFundSource` function (lines 19–27) with:

```js
export function groupByFundSource(positions, prices = {}) {
  const map = {}
  for (const p of positions) {
    if (!p.fundSource) continue
    if (!map[p.fundSource]) map[p.fundSource] = { cost: 0, totalAsset: 0 }
    const posCost = p.shares * p.costPrice
    const currentPrice = prices[p.code]?.price
    map[p.fundSource].cost += posCost
    map[p.fundSource].totalAsset += currentPrice != null ? p.shares * currentPrice : posCost
  }
  return map
}
```

- [ ] **Step 4: Update the async page function**

Replace the `FundManagement` async function body (from `let positions = []` to the `grouped` line) with:

```js
  let positions = []
  try {
    const rows = await getRows('持倉')
    positions = rows.map((row) => ({
      code: row['股票代號'],
      fundSource: row['資金來源'],
      shares: Number(row['股數']),
      costPrice: Number(row['成本價']),
    }))
  } catch (err) {
    console.error('Failed to load positions for fund management:', err.message)
  }

  const symbols = [...new Set(positions.map((p) => p.code).filter(Boolean))]
  const prices = symbols.length > 0 ? await getPrices(symbols) : {}

  const grouped = groupByFundSource(positions, prices)
```

Also add the import at the top of the file:

```js
import { getPrices } from '@/lib/prices'
```

- [ ] **Step 5: Update `fundPools` to use real profit/profitRate**

Replace the `fundPools` mapping:

```js
  const fundPools = Object.entries(POOL_CONFIG).map(([name, cfg]) => {
    const cost = Math.round(grouped[name]?.cost ?? 0)
    const totalAsset = Math.round(grouped[name]?.totalAsset ?? cost)
    const profit = totalAsset - cost
    const profitRate = cost > 0 ? +(profit / cost * 100).toFixed(2) : null
    return { ...cfg, name, cost, totalAsset, profit, profitRate }
  })
```

- [ ] **Step 6: Update the fund pool cards JSX to show profit/profitRate**

Replace the `<div className="space-y-3">` block inside each pool card:

```jsx
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">投入成本</p>
                  <p className="text-2xl font-bold text-gray-900">NT$ {pool.cost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">目前價值</p>
                  <p className="text-xl font-semibold text-gray-900">NT$ {pool.totalAsset.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">損益</p>
                    <p className={`text-lg font-semibold ${pool.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pool.profit >= 0 ? '+' : ''}NT$ {pool.profit.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">報酬率</p>
                    <p className={`text-lg font-semibold ${pool.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pool.profitRate != null ? `${pool.profit >= 0 ? '+' : ''}${pool.profitRate}%` : '—'}
                    </p>
                  </div>
                </div>
              </div>
```

- [ ] **Step 7: Remove the "待 FinMind" placeholder text from the hero banner**

In the hero banner `<p>` subtitle, replace:

```jsx
<p className="text-slate-300 text-sm">現值損益待 FinMind 串接後計算</p>
```

With:

```jsx
<p className="text-slate-300 text-sm">各資金池損益詳見下方卡片</p>
```

- [ ] **Step 8: Run tests**

```bash
npx jest
```

Expected: all 5 tests in fund-management suite pass (3 existing + 2 new), full suite passes

- [ ] **Step 9: Commit**

```bash
git add app/fund-management/page.js app/fund-management/fund-management.test.js
git commit -m "feat: wire fund management to real prices, show profit and profitRate per pool"
```

---

## Task 5: `app/watchlist/page.js` — Merge Real Prices

**Files:**
- Modify: `app/watchlist/page.js`

- [ ] **Step 1: Fix null guards on `isPriceNearTarget` and `isPriceNearStopLoss`**

Replace the two functions at the top of the file:

```js
function isPriceNearTarget(current, target) {
  if (current == null || !target) return false
  return Math.abs((current - target) / target) < 0.05
}

function isPriceNearStopLoss(current, stopLoss) {
  if (current == null || !stopLoss) return false
  return Math.abs((current - stopLoss) / stopLoss) < 0.05
}
```

- [ ] **Step 2: Update `loadWatchlist` to fetch and merge prices**

Replace the `loadWatchlist` function:

```js
  function loadWatchlist() {
    setLoading(true)
    fetch('/api/watchlist')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(async (items) => {
        if (items.length === 0) {
          setWatchlist([])
          return
        }
        const symbols = items.map((i) => i.symbol).join(',')
        let prices = {}
        try {
          const priceRes = await fetch(`/api/prices?symbols=${symbols}`)
          if (priceRes.ok) prices = await priceRes.json()
        } catch {
          // prices stay empty, UI degrades gracefully
        }
        setWatchlist(
          items.map((item) => ({
            ...item,
            currentPrice: prices[item.symbol]?.price ?? null,
            change: prices[item.symbol]?.change ?? null,
            changePercent: prices[item.symbol]?.changePercent ?? null,
          }))
        )
      })
      .catch(() => setWatchlist([]))
      .finally(() => setLoading(false))
  }
```

- [ ] **Step 3: Guard null price/change renders in the table**

Replace the two price/change table cells in the row render:

```jsx
                    <td className="py-4 px-6 text-right font-semibold text-gray-900">
                      {item.currentPrice != null ? `NT$ ${item.currentPrice.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {item.change != null ? (
                        <div className={`flex items-center justify-end gap-1 ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            {item.change >= 0
                              ? <><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></>
                              : <><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/></>
                            }
                          </svg>
                          <span className="font-semibold">
                            {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}
                          </span>
                          <span className="text-sm">
                            ({item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                      ) : '—'}
                    </td>
```

- [ ] **Step 4: Run tests**

```bash
npx jest
```

Expected: all tests pass (watchlist has no unit tests; existing suite unaffected)

- [ ] **Step 5: Commit**

```bash
git add app/watchlist/page.js
git commit -m "feat: wire watchlist to /api/prices, guard null price renders"
```
