# Dashboard Real Data Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded mock data in `app/page.js` with real data from Google Sheets and FinMind prices.

**Architecture:** `app/page.js` becomes an async server component with `export const dynamic = 'force-dynamic'`. It fetches `持倉` and `交易記錄` sheets in parallel, calls `getPrices` for current prices, then passes computed data to the existing `StatCard`, `DonutChart`, and `TradesTable` components unchanged. Two pure functions are exported for testability: `computeDashboardStats` and `toDonutPositions`.

**Tech Stack:** Next.js App Router, `lib/sheets.js` (`getRows`), `lib/prices.js` (`getPrices`), Jest

---

## File Map

Modified:
- `app/page.js` — replace mock data with async server component

New:
- `app/dashboard.test.js` — unit tests for `computeDashboardStats` and `toDonutPositions`

---

## Context

Existing components and their expected props:
- `StatCard({ label, value, change })` — `change` is a percentage number; when `null`/`undefined`, no arrow indicator is shown
- `DonutChart({ positions })` — `positions: { name, code, value, color }[]`
- `TradesTable({ trades, limit })` — `trades: { date, type, name, code, amount }[]`

`lib/sheets.js` exports `getRows(sheetName)` — returns array of objects keyed by header row.
`lib/prices.js` exports `getPrices(symbols)` — returns `{ [symbol]: { price, change, changePercent } | null }`.

Sheet column names:
- 持倉: `股票代號`, `股票名稱`, `股數`, `成本價`, `資金來源`
- 交易記錄: `日期`, `類型`, `股票代號`, `股票名稱`, `金額`

Run tests with: `npx jest`

---

## Task 1: Dashboard Page — Real Data

**Files:**
- Modify: `app/page.js`
- Create: `app/dashboard.test.js`

- [ ] **Step 1: Write the failing tests**

Create `app/dashboard.test.js`:

```js
import { computeDashboardStats, toDonutPositions } from './page'

describe('computeDashboardStats', () => {
  const priced = [
    { code: '2330', name: '台積電', shares: 10, costPrice: 500, currentPrice: 600, change: 10,  fundSource: '定期定額' },
    { code: '2454', name: '聯發科', shares: 5,  costPrice: 800, currentPrice: 900, change: -5,  fundSource: '貸款資金' },
  ]
  const unpriced = [
    { code: '2317', name: '鴻海',   shares: 20, costPrice: 100, currentPrice: null, change: null, fundSource: '閒錢操作' },
  ]

  test('netAssets uses currentPrice for priced positions, costPrice for unpriced', () => {
    const { netAssets } = computeDashboardStats([...priced, ...unpriced])
    // priced:   10*600 + 5*900  = 10500
    // unpriced: 20*100          = 2000
    expect(netAssets).toBe(12500)
  })

  test('todayPnl sums change × shares for priced positions', () => {
    const { todayPnl } = computeDashboardStats(priced)
    // 10*10 + 5*(-5) = 100 - 25 = 75
    expect(todayPnl).toBe(75)
  })

  test('todayPct is todayPnl / prevValue × 100', () => {
    const { todayPct } = computeDashboardStats(priced)
    // prevValue: 10*(600-10) + 5*(900+5) = 5900 + 4525 = 10425
    // todayPct:  75 / 10425 * 100
    expect(todayPct).toBeCloseTo(75 / 10425 * 100)
  })

  test('todayPnl and todayPct are null when no positions have prices', () => {
    const { todayPnl, todayPct } = computeDashboardStats(unpriced)
    expect(todayPnl).toBeNull()
    expect(todayPct).toBeNull()
  })

  test('returns zero netAssets and null pnl for empty positions', () => {
    const { netAssets, todayPnl, todayPct } = computeDashboardStats([])
    expect(netAssets).toBe(0)
    expect(todayPnl).toBeNull()
    expect(todayPct).toBeNull()
  })
})

describe('toDonutPositions', () => {
  test('uses currentPrice × shares when price available', () => {
    const positions = [
      { code: '2330', name: '台積電', shares: 10, costPrice: 500, currentPrice: 600, change: 10, fundSource: '定期定額' },
    ]
    const result = toDonutPositions(positions)
    expect(result[0].value).toBe(6000)
    expect(result[0].color).toBe('#3b82f6')
  })

  test('falls back to costPrice × shares when currentPrice is null', () => {
    const positions = [
      { code: '2317', name: '鴻海', shares: 20, costPrice: 100, currentPrice: null, change: null, fundSource: '閒錢操作' },
    ]
    const result = toDonutPositions(positions)
    expect(result[0].value).toBe(2000)
    expect(result[0].color).toBe('#10b981')
  })

  test('assigns gray (#94a3b8) for unknown or blank fundSource', () => {
    const positions = [
      { code: '2330', name: '台積電', shares: 10, costPrice: 500, currentPrice: null, change: null, fundSource: '' },
    ]
    const result = toDonutPositions(positions)
    expect(result[0].color).toBe('#94a3b8')
  })

  test('excludes positions with zero value', () => {
    const positions = [
      { code: '2330', name: '台積電', shares: 0,  costPrice: 0,   currentPrice: null, change: null, fundSource: '定期定額' },
      { code: '2454', name: '聯發科', shares: 5,  costPrice: 100, currentPrice: null, change: null, fundSource: '貸款資金' },
    ]
    const result = toDonutPositions(positions)
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('2454')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/dashboard.test.js
```

Expected: FAIL — `Cannot find module './page'` or named exports not found

- [ ] **Step 3: Replace `app/page.js` entirely**

```js
import { getRows } from '@/lib/sheets'
import { getPrices } from '@/lib/prices'
import StatCard from '@/components/dashboard/stat-card'
import DonutChart from '@/components/dashboard/donut-chart'
import TradesTable from '@/components/dashboard/trades-table'

export const dynamic = 'force-dynamic'

const FUND_COLORS = {
  '定期定額': '#3b82f6',
  '貸款資金': '#8b5cf6',
  '閒錢操作': '#10b981',
}

export function computeDashboardStats(positions) {
  const netAssets = positions.reduce((s, p) => {
    return s + (p.currentPrice != null ? p.currentPrice * p.shares : p.costPrice * p.shares)
  }, 0)

  const priced = positions.filter((p) => p.currentPrice != null && p.change != null)
  if (priced.length === 0) return { netAssets, todayPnl: null, todayPct: null }

  const todayPnl = priced.reduce((s, p) => s + p.change * p.shares, 0)
  const prevValue = priced.reduce((s, p) => s + (p.currentPrice - p.change) * p.shares, 0)
  const todayPct = prevValue > 0 ? (todayPnl / prevValue) * 100 : null

  return { netAssets, todayPnl, todayPct }
}

export function toDonutPositions(positions) {
  return positions
    .map((p) => ({
      name: p.name,
      code: p.code,
      value: p.currentPrice != null ? p.currentPrice * p.shares : p.costPrice * p.shares,
      color: FUND_COLORS[p.fundSource] ?? '#94a3b8',
    }))
    .filter((p) => p.value > 0)
}

export default async function DashboardPage() {
  let positions = []
  let recentTrades = []

  try {
    const [posRows, tradeRows] = await Promise.all([
      getRows('持倉'),
      getRows('交易記錄'),
    ])

    const rawPositions = posRows.map((row) => ({
      code: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']),
      costPrice: Number(row['成本價']),
      fundSource: row['資金來源'],
    }))

    const symbols = [...new Set(rawPositions.map((p) => p.code))]
    const prices = symbols.length > 0 ? await getPrices(symbols) : {}

    positions = rawPositions.map((p) => ({
      ...p,
      currentPrice: prices[p.code]?.price ?? null,
      change: prices[p.code]?.change ?? null,
    }))

    recentTrades = tradeRows.slice(-5).reverse().map((row) => ({
      date: row['日期'],
      type: row['類型'],
      name: row['股票名稱'],
      code: row['股票代號'],
      amount: Number(row['金額']),
    }))
  } catch (err) {
    console.error('Dashboard data failed:', err.message)
  }

  const { netAssets, todayPnl, todayPct } = computeDashboardStats(positions)
  const donutPositions = toDonutPositions(positions)

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Dashboard 總覽</h1>
      <p className="text-sm text-gray-500 mb-7">資產追蹤與最新動態</p>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <StatCard
          label="資產淨值"
          value={`NT$ ${Math.round(netAssets).toLocaleString()}`}
        />
        <StatCard
          label="今日損益"
          value={todayPnl != null ? `NT$ ${Math.round(todayPnl).toLocaleString()}` : '—'}
          change={todayPct}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">持倉概況</h2>
          <DonutChart positions={donutPositions} />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <TradesTable trades={recentTrades} />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run new tests to verify they pass**

```bash
npx jest app/dashboard.test.js
```

Expected: 9 tests pass

- [ ] **Step 5: Run full test suite**

```bash
npx jest
```

Expected: 45 tests pass across 7 suites (36 existing + 9 new)

- [ ] **Step 6: Commit**

```bash
git add app/page.js app/dashboard.test.js
git commit -m "feat: wire dashboard to real Sheets data and FinMind prices"
```
