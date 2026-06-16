# Performance Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded mock data on the `/performance` page with real metrics and cost-basis time series computed from Google Sheets trade records and current prices from FinMind.

**Architecture:** A new `lib/performance.js` provides pure functions for computing metrics from trade arrays. The async server component `app/performance/page.js` fetches trades and prices, then passes computed results to a client component `components/performance/performance-client.js` that handles time-range filtering and rendering. Same pattern as `app/positions/page.js`.

**Tech Stack:** Next.js (App Router), Google Sheets API via `lib/sheets.js`, FinMind API via `lib/prices.js`, Jest for unit tests.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/performance.js` | Pure functions: `buildCostSeries`, `computeRealizedPnl`, `computeWinRate`, `computeAnnualizedReturn` |
| Create | `lib/performance.test.js` | Unit tests for all four functions |
| Create | `components/performance/performance-client.js` | Client component: time-range buttons, metric cards, SVG chart |
| Modify | `app/performance/page.js` | Async server component — data fetching, computation, renders `<PerformanceClient>` |

---

## Task 1: `buildCostSeries` — monthly cost-basis time series

**Files:**
- Create: `lib/performance.test.js`
- Create: `lib/performance.js`

- [ ] **Step 1: Write failing tests in `lib/performance.test.js`**

```js
import { buildCostSeries } from './performance'

const t = (overrides) => ({
  date: '2026-01-01',
  type: '買入',
  fundSource: '閒錢操作',
  symbol: '2330',
  name: '台積電',
  shares: 10,
  amount: 1000,
  fee: 10,
  ...overrides,
})

describe('buildCostSeries', () => {
  test('empty trades → []', () => {
    expect(buildCostSeries([], new Date('2026-01-31'))).toEqual([])
  })

  test('single buy → one month entry with correct cost', () => {
    const trades = [t({ date: '2026-01-15', shares: 10, amount: 1000, fee: 10 })]
    const result = buildCostSeries(trades, new Date('2026-01-31'))
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ month: '2026-01', cost: 1010 })
  })

  test('buy in Jan, another in Feb → cost accumulates', () => {
    const trades = [
      t({ date: '2026-01-15', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-15', shares: 5,  amount: 500,  fee: 5  }),
    ]
    const result = buildCostSeries(trades, new Date('2026-02-28'))
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ month: '2026-01', cost: 1010 })
    expect(result[1]).toEqual({ month: '2026-02', cost: 1515 })
  })

  test('sell in Feb reduces cost in Feb entry', () => {
    // Buy 10 shares: totalCost = 1010, costPrice = 101
    // Sell 5 shares in Feb: 5 shares remain, costPrice still 101
    // Feb cost = 5 * 101 = 505
    const trades = [
      t({ date: '2026-01-15', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-15', type: '賣出', shares: 5, amount: 505, fee: 5 }),
    ]
    const result = buildCostSeries(trades, new Date('2026-02-28'))
    expect(result[0]).toEqual({ month: '2026-01', cost: 1010 })
    expect(result[1]).toEqual({ month: '2026-02', cost: 505 })
  })

  test('months with no trades still appear (cost carried forward)', () => {
    const trades = [
      t({ date: '2026-01-15', shares: 10, amount: 1000, fee: 10 }),
    ]
    const result = buildCostSeries(trades, new Date('2026-03-31'))
    expect(result).toHaveLength(3)
    expect(result[1]).toEqual({ month: '2026-02', cost: 1010 })
    expect(result[2]).toEqual({ month: '2026-03', cost: 1010 })
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```
npx jest lib/performance.test.js --no-coverage
```

Expected: `Cannot find module './performance'`

- [ ] **Step 3: Create `lib/performance.js` with `buildCostSeries`**

```js
import { aggregateTrades } from './positions'

export function buildCostSeries(trades, today = new Date()) {
  if (!trades || trades.length === 0) return []
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  const first = new Date(sorted[0].date)
  const result = []
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1)
  const endYear = today.getFullYear()
  const endMonth = today.getMonth()

  while (
    cursor.getFullYear() < endYear ||
    (cursor.getFullYear() === endYear && cursor.getMonth() <= endMonth)
  ) {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const until = new Date(y, m + 1, 0).toISOString().slice(0, 10)
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`
    const positions = aggregateTrades(trades, { until })
    const cost = positions.reduce((s, p) => s + p.costPrice * p.shares, 0)
    result.push({ month: monthStr, cost: Math.round(cost) })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx jest lib/performance.test.js --no-coverage
```

Expected: All `buildCostSeries` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/performance.js lib/performance.test.js
git commit -m "feat: add buildCostSeries to lib/performance"
```

---

## Task 2: `computeRealizedPnl` — total realized profit/loss from sell trades

**Files:**
- Modify: `lib/performance.js`
- Modify: `lib/performance.test.js`

- [ ] **Step 1: Add failing tests to `lib/performance.test.js`**

Add after the existing `buildCostSeries` describe block:

```js
import { buildCostSeries, computeRealizedPnl } from './performance'

// (keep existing t() helper and buildCostSeries tests above)

describe('computeRealizedPnl', () => {
  test('no sells → 0', () => {
    expect(computeRealizedPnl([t()])).toBe(0)
  })

  test('sell at profit → positive value', () => {
    // Buy 10 shares: totalCost 1010, costPrice 101/share
    // Sell 5 shares: proceeds = 600 - 5 = 595; cost basis = 5 * 101 = 505
    // PnL = 595 - 505 = 90
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-01', type: '賣出', shares: 5, amount: 600, fee: 5 }),
    ]
    expect(computeRealizedPnl(trades)).toBe(90)
  })

  test('sell at loss → negative value', () => {
    // costPrice 101/share
    // Sell 5 shares: proceeds = 400 - 5 = 395; cost = 5 * 101 = 505
    // PnL = 395 - 505 = -110
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-01', type: '賣出', shares: 5, amount: 400, fee: 5 }),
    ]
    expect(computeRealizedPnl(trades)).toBe(-110)
  })

  test('multiple sells → summed', () => {
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }), // costPrice 101
      t({ date: '2026-02-01', type: '賣出', shares: 3, amount: 360, fee: 3 }), // proceeds 357, cost 303, PnL +54
      t({ date: '2026-03-01', type: '賣出', shares: 3, amount: 240, fee: 3 }), // proceeds 237, cost 303, PnL -66
    ]
    // Total PnL = 54 + (-66) = -12
    expect(computeRealizedPnl(trades)).toBe(-12)
  })
})
```

Update the import line at the top of `lib/performance.test.js` to include `computeRealizedPnl`.

- [ ] **Step 2: Run to verify new tests fail**

```
npx jest lib/performance.test.js --no-coverage
```

Expected: `computeRealizedPnl` tests FAIL with `not a function`.

- [ ] **Step 3: Add `computeRealizedPnl` to `lib/performance.js`**

Add after `buildCostSeries`:

```js
export function computeRealizedPnl(trades) {
  const sells = trades.filter((t) => t.type === '賣出')
  let total = 0
  for (const sell of sells) {
    const tradesBeforeSell = trades.filter((t) => t !== sell && t.date < sell.date)
    const positions = aggregateTrades(tradesBeforeSell)
    const pos = positions.find((p) => p.code === sell.symbol && p.fundSource === sell.fundSource)
    if (!pos) continue
    const proceeds = sell.amount - sell.fee
    const costOfSold = pos.costPrice * sell.shares
    total += proceeds - costOfSold
  }
  return Math.round(total)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx jest lib/performance.test.js --no-coverage
```

Expected: All `computeRealizedPnl` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/performance.js lib/performance.test.js
git commit -m "feat: add computeRealizedPnl to lib/performance"
```

---

## Task 3: `computeWinRate` — percentage of profitable sell trades

**Files:**
- Modify: `lib/performance.js`
- Modify: `lib/performance.test.js`

- [ ] **Step 1: Add failing tests**

Update the import at the top of `lib/performance.test.js` to include `computeWinRate`. Add after the `computeRealizedPnl` describe block:

```js
describe('computeWinRate', () => {
  test('no sell trades → rate is null', () => {
    expect(computeWinRate([t()])).toEqual({ wins: 0, total: 0, rate: null })
  })

  test('one sell above cost price → 100%', () => {
    // costPrice = 101, sell.price = 120 → win
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-01', type: '賣出', shares: 5, price: 120, amount: 600, fee: 5 }),
    ]
    expect(computeWinRate(trades)).toEqual({ wins: 1, total: 1, rate: 100.0 })
  })

  test('one sell below cost price → 0%', () => {
    // costPrice = 101, sell.price = 80 → loss
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-01', type: '賣出', shares: 5, price: 80, amount: 400, fee: 5 }),
    ]
    expect(computeWinRate(trades)).toEqual({ wins: 0, total: 1, rate: 0.0 })
  })

  test('two sells, one win one loss → 50%', () => {
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }), // costPrice 101
      t({ date: '2026-02-01', type: '賣出', shares: 3, price: 120, amount: 360, fee: 3 }), // win
      t({ date: '2026-03-01', type: '賣出', shares: 3, price: 80,  amount: 240, fee: 3 }), // loss
    ]
    expect(computeWinRate(trades)).toEqual({ wins: 1, total: 2, rate: 50.0 })
  })
})
```

- [ ] **Step 2: Run to verify new tests fail**

```
npx jest lib/performance.test.js --no-coverage
```

Expected: `computeWinRate` tests FAIL with `not a function`.

- [ ] **Step 3: Add `computeWinRate` to `lib/performance.js`**

Add after `computeRealizedPnl`:

```js
export function computeWinRate(trades) {
  const sells = trades.filter((t) => t.type === '賣出')
  if (sells.length === 0) return { wins: 0, total: 0, rate: null }
  let wins = 0
  for (const sell of sells) {
    const tradesBeforeSell = trades.filter((t) => t !== sell && t.date < sell.date)
    const positions = aggregateTrades(tradesBeforeSell)
    const pos = positions.find((p) => p.code === sell.symbol && p.fundSource === sell.fundSource)
    if (!pos) continue
    if (sell.price > pos.costPrice) wins++
  }
  return { wins, total: sells.length, rate: +(wins / sells.length * 100).toFixed(1) }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx jest lib/performance.test.js --no-coverage
```

Expected: All `computeWinRate` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/performance.js lib/performance.test.js
git commit -m "feat: add computeWinRate to lib/performance"
```

---

## Task 4: `computeAnnualizedReturn` — annualized total return including unrealized gains

**Files:**
- Modify: `lib/performance.js`
- Modify: `lib/performance.test.js`

- [ ] **Step 1: Add failing tests**

Update the import at the top of `lib/performance.test.js` to include `computeAnnualizedReturn`. Add after the `computeWinRate` describe block:

```js
describe('computeAnnualizedReturn', () => {
  test('empty trades → null', () => {
    expect(computeAnnualizedReturn([], [], {}, new Date('2026-06-16'))).toBeNull()
  })

  test('holding days 0 (first trade is today) → null', () => {
    const today = new Date('2026-01-01')
    const trades = [t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 })]
    expect(computeAnnualizedReturn(trades, [], {}, today)).toBeNull()
  })

  test('100% total return over exactly 365 days → ~100% annualized', () => {
    // Buy 10 shares: totalCost = 1010, costPrice = 101/share
    // 365 days later, price = 202 (double)
    // unrealized PnL = (202 - 101) * 10 = 1010
    // totalReturn = 1010 / 1010 = 100%
    // annualized = (1 + 1)^(365/365) - 1 = 1.0 → 100%
    const trades = [t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 })]
    const positions = [{ code: '2330', fundSource: '閒錢操作', shares: 10, costPrice: 101 }]
    const prices = { '2330': { price: 202 } }
    const today = new Date('2027-01-01')
    const result = computeAnnualizedReturn(trades, positions, prices, today)
    expect(result).toBeCloseTo(100.0, 0)
  })

  test('positions with no price → excluded from unrealized PnL', () => {
    // Only realized PnL counts; unrealized not included if price is null
    // Buy 10 @ cost 101, sell 5 at 120 → realized PnL = (600-5) - 5*101 = 595 - 505 = 90
    // Remaining 5 shares have no current price → unrealized = 0
    // totalReturn = 90 / 1010; holdingDays = 365
    const trades = [
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-02-01', type: '賣出', shares: 5, price: 120, amount: 600, fee: 5 }),
    ]
    const positions = [{ code: '2330', fundSource: '閒錢操作', shares: 5, costPrice: 101 }]
    const prices = {}
    const today = new Date('2027-01-01')
    const result = computeAnnualizedReturn(trades, positions, prices, today)
    const expectedReturn = 90 / 1010
    const expected = (Math.pow(1 + expectedReturn, 365 / 365) - 1) * 100
    expect(result).toBeCloseTo(expected, 0)
  })
})
```

- [ ] **Step 2: Run to verify new tests fail**

```
npx jest lib/performance.test.js --no-coverage
```

Expected: `computeAnnualizedReturn` tests FAIL with `not a function`.

- [ ] **Step 3: Add `computeAnnualizedReturn` to `lib/performance.js`**

Add after `computeWinRate`:

```js
export function computeAnnualizedReturn(trades, positions, prices, today = new Date()) {
  if (!trades || trades.length === 0) return null
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  const firstDate = new Date(sorted[0].date)
  const holdingDays = Math.round((today - firstDate) / (1000 * 60 * 60 * 24))
  if (holdingDays === 0) return null

  const totalCost = trades
    .filter((t) => t.type === '買入')
    .reduce((s, t) => s + t.amount + t.fee, 0)
  if (totalCost === 0) return null

  const realizedPnl = computeRealizedPnl(trades)
  const unrealizedPnl = positions
    .filter((p) => prices[p.code]?.price != null)
    .reduce((s, p) => s + (prices[p.code].price - p.costPrice) * p.shares, 0)

  const totalReturn = (realizedPnl + unrealizedPnl) / totalCost
  const annualized = Math.pow(1 + totalReturn, 365 / holdingDays) - 1
  return +(annualized * 100).toFixed(1)
}
```

- [ ] **Step 4: Run all tests to verify everything passes**

```
npx jest lib/performance.test.js --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/performance.js lib/performance.test.js
git commit -m "feat: add computeAnnualizedReturn to lib/performance"
```

---

## Task 5: Create `PerformanceClient` component

**Files:**
- Create: `components/performance/performance-client.js`

- [ ] **Step 1: Create the file**

```js
'use client'

import { useState } from 'react'

const W = 560, H = 220
const PL = 64, PR = 16, PT = 16, PB = 32
const CW = W - PL - PR
const CH = H - PT - PB

function toX(i, total) {
  if (total === 1) return PL + CW / 2
  return PL + i * (CW / (total - 1))
}

function CostChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-400 py-8">尚無資料</p>
  }

  const values = data.map((d) => d.cost)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const padding = (rawMax - rawMin) * 0.15 || rawMin * 0.1 || 100000
  const yMin = Math.max(0, rawMin - padding)
  const yMax = rawMax + padding

  function toY(v) {
    return PT + CH - ((v - yMin) / (yMax - yMin)) * CH
  }

  const yLabels = Array.from({ length: 4 }, (_, i) =>
    Math.round(yMin + ((yMax - yMin) * i) / 3)
  )

  const points = data.map((d, i) => `${toX(i, data.length)},${toY(d.cost)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" className="overflow-visible">
      {yLabels.map((v) => (
        <g key={v}>
          <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke="#e5e7eb" strokeWidth={1} />
          <text x={PL - 6} y={toY(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${Math.round(v / 1000)}K`}
          </text>
        </g>
      ))}
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={3} />
      {data.map((d, i) => (
        <g key={d.month}>
          <circle cx={toX(i, data.length)} cy={toY(d.cost)} r={4} fill="#3b82f6" />
          {(data.length <= 12 || i % Math.ceil(data.length / 12) === 0) && (
            <text x={toX(i, data.length)} y={H - 6} textAnchor="middle" fontSize={10} fill="#9ca3af">
              {d.month.slice(2)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function filterSeries(costSeries, range) {
  if (range === '月') {
    return costSeries.slice(-12)
  }
  if (range === '季') {
    const last3Years = costSeries.slice(-36)
    const quarterMonths = ['03', '06', '09', '12']
    const quarterly = last3Years.filter((d) => quarterMonths.includes(d.month.slice(5, 7)))
    if (last3Years.length > 0 && !quarterly.includes(last3Years[last3Years.length - 1])) {
      quarterly.push(last3Years[last3Years.length - 1])
    }
    return quarterly
  }
  // 年 — all history, one point per year
  const byYear = new Map()
  for (const d of costSeries) {
    byYear.set(d.month.slice(0, 4), d)
  }
  return [...byYear.values()]
}

function formatReturn(val) {
  if (val == null) return { text: '—', color: 'text-gray-400' }
  const sign = val >= 0 ? '+' : ''
  return {
    text: `${sign}${val.toFixed(1)}%`,
    color: val >= 0 ? 'text-green-600' : 'text-red-600',
  }
}

function formatPnl(val) {
  if (val == null) return { text: 'NT$ 0', color: 'text-gray-900' }
  const sign = val >= 0 ? '+' : ''
  return {
    text: `${sign}NT$ ${Math.abs(val).toLocaleString()}`,
    color: val >= 0 ? 'text-green-600' : 'text-red-600',
  }
}

function formatWinRate(winRate) {
  if (winRate.rate == null) return { text: '—', color: 'text-gray-400' }
  return { text: `${winRate.rate.toFixed(1)}%`, color: 'text-blue-600' }
}

export default function PerformanceClient({
  costSeries,
  annualizedReturn,
  realizedPnl,
  winRate,
}) {
  const [range, setRange] = useState('月')
  const filtered = filterSeries(costSeries, range)

  const ret = formatReturn(annualizedReturn)
  const pnl = formatPnl(realizedPnl)
  const wr = formatWinRate(winRate)

  const metrics = [
    {
      label: '年化報酬率',
      ...ret,
      bgColor: annualizedReturn == null ? 'bg-gray-50' : annualizedReturn >= 0 ? 'bg-green-50' : 'bg-red-50',
      borderColor: annualizedReturn == null ? 'border-gray-200' : annualizedReturn >= 0 ? 'border-green-200' : 'border-red-200',
    },
    {
      label: '已實現損益',
      ...pnl,
      bgColor: realizedPnl > 0 ? 'bg-green-50' : realizedPnl < 0 ? 'bg-red-50' : 'bg-gray-50',
      borderColor: realizedPnl > 0 ? 'border-green-200' : realizedPnl < 0 ? 'border-red-200' : 'border-gray-200',
    },
    {
      label: '勝率',
      ...wr,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  ]

  return (
    <>
      <div className="flex gap-2 mb-6">
        {['月', '季', '年'].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              range === r
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {r}度
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className={`bg-white rounded-xl shadow-sm p-6 border ${m.borderColor}`}>
            <h3 className="text-sm font-medium text-gray-600 mb-4">{m.label}</h3>
            <p className={`text-4xl font-bold ${m.color}`}>{m.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">投入成本走勢</h3>
        <CostChart data={filtered} />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/performance/performance-client.js
git commit -m "feat: add PerformanceClient component"
```

---

## Task 6: Update `app/performance/page.js` to use real data

**Files:**
- Modify: `app/performance/page.js`

- [ ] **Step 1: Replace the entire file**

```js
import { getRows } from '@/lib/sheets'
import { aggregateTrades } from '@/lib/positions'
import { getPrices } from '@/lib/prices'
import {
  buildCostSeries,
  computeRealizedPnl,
  computeWinRate,
  computeAnnualizedReturn,
} from '@/lib/performance'
import PerformanceClient from '@/components/performance/performance-client'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
  let costSeries = []
  let annualizedReturn = null
  let realizedPnl = 0
  let winRate = { wins: 0, total: 0, rate: null }

  try {
    const rows = await getRows('交易記錄')
    const trades = rows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']) * 1000,
      price: Number(row['價格']),
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))

    const rawPositions = aggregateTrades(trades)
    const symbols = [...new Set(rawPositions.map((p) => p.code))]
    const prices = symbols.length > 0 ? await getPrices(symbols) : {}

    costSeries = buildCostSeries(trades)
    realizedPnl = computeRealizedPnl(trades)
    winRate = computeWinRate(trades)
    annualizedReturn = computeAnnualizedReturn(trades, rawPositions, prices)
  } catch (err) {
    console.error('Failed to load performance data:', err.message)
  }

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">績效分析</h1>
        <p className="text-gray-500 mt-2">投資組合表現總覽</p>
      </div>
      <PerformanceClient
        costSeries={costSeries}
        annualizedReturn={annualizedReturn}
        realizedPnl={realizedPnl}
        winRate={winRate}
      />
    </main>
  )
}
```

- [ ] **Step 2: Run full test suite to make sure nothing is broken**

```
npx jest --no-coverage
```

Expected: All existing tests still PASS, all new performance tests PASS.

- [ ] **Step 3: Commit**

```bash
git add app/performance/page.js
git commit -m "feat: connect performance page to real trade data"
```
