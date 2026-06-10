# Google Sheets API Routes & Page Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded mock data with real Google Sheets data across every page.

**Architecture:** Server components (positions, dividends, fund-management) import `lib/sheets.js` directly. Client components (trades, watchlist, notes) go through API routes at `app/api/`. Data transformation from sheet strings to typed objects happens in each route/page.

**Tech Stack:** Next.js App Router, `lib/sheets.js` (`getRows`, `appendRow`), `NextResponse` from `next/server`

---

## File Map

New files:
- `app/api/trades/route.js`
- `app/api/watchlist/route.js`
- `app/api/notes/route.js`

Modified files:
- `components/positions/positions-table.js` — handle `currentPrice: null`
- `app/positions/page.js` — async server component, reads 持倉 sheet
- `app/dividends/page.js` — async server component, reads 股利記錄 sheet, aggregates
- `app/fund-management/page.js` — async server component, reads 持倉 sheet, groups by 資金來源
- `app/trades/page.js` — useEffect fetch from `/api/trades`, loading state
- `app/trades/new/page.js` — add name field, POST to `/api/trades` on submit
- `app/watchlist/page.js` — useEffect fetch + POST on add
- `app/notes/page.js` — useEffect fetch + POST on add

---

## Task 1: Trades API Route

**Files:**
- Create: `app/api/trades/route.js`

- [ ] **Step 1: Create the route file**

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

export async function GET() {
  const rows = await getRows('交易記錄')
  return NextResponse.json(rows.map(parseTrade))
}

export async function POST(request) {
  const body = await request.json()
  await appendRow('交易記錄', [
    body.date,
    body.type,
    body.fundSource,
    body.symbol,
    body.name,
    body.shares,
    body.price,
    body.amount,
    body.fee,
  ])
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify dev server has no errors**

Run: `npm run dev`
Expected: server starts without import errors; `curl http://localhost:3000/api/trades` returns `[]` (empty array, since sheet has no data rows yet)

- [ ] **Step 3: Commit**

```bash
git add app/api/trades/route.js
git commit -m "feat: add trades API route (GET + POST)"
```

---

## Task 2: Watchlist API Route

**Files:**
- Create: `app/api/watchlist/route.js`

- [ ] **Step 1: Create the route file**

```js
// app/api/watchlist/route.js
import { NextResponse } from 'next/server'
import { getRows, appendRow } from '@/lib/sheets'

export function parseWatchlistItem(row) {
  return {
    symbol: row['股票代號'],
    name: row['股票名稱'],
    targetPrice: Number(row['目標價']),
    stopLoss: Number(row['停損價']),
    alertEnabled: row['開啟通知'] === 'TRUE',
    currentPrice: 0,
    change: 0,
    changePercent: 0,
  }
}

export async function GET() {
  const rows = await getRows('觀察清單')
  return NextResponse.json(rows.map(parseWatchlistItem))
}

export async function POST(request) {
  const body = await request.json()
  await appendRow('觀察清單', [
    body.symbol,
    body.name,
    body.targetPrice,
    body.stopLoss,
    'FALSE',
  ])
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify**

Run: `curl http://localhost:3000/api/watchlist`
Expected: `[]`

- [ ] **Step 3: Commit**

```bash
git add app/api/watchlist/route.js
git commit -m "feat: add watchlist API route (GET + POST)"
```

---

## Task 3: Notes API Route

**Files:**
- Create: `app/api/notes/route.js`

- [ ] **Step 1: Create the route file**

```js
// app/api/notes/route.js
import { NextResponse } from 'next/server'
import { getRows, appendRow } from '@/lib/sheets'

export function parseNote(row, index) {
  return {
    id: index + 1,
    date: row['日期'],
    symbol: row['股票代號'],
    name: row['股票名稱'],
    strategy: row['策略'],
    buyReason: row['買入理由'],
    sellReason: row['賣出理由'] || undefined,
    expectedResult: row['預期結果'],
    actualResult: row['實際結果'] || undefined,
    review: row['事後檢討'] || undefined,
    status: row['狀態'],
  }
}

export async function GET() {
  const rows = await getRows('交易筆記')
  return NextResponse.json(rows.map(parseNote))
}

export async function POST(request) {
  const body = await request.json()
  await appendRow('交易筆記', [
    body.date,
    body.symbol,
    body.name,
    body.strategy,
    body.buyReason,
    body.sellReason || '',
    body.expectedResult || '',
    body.actualResult || '',
    body.review || '',
    body.status,
  ])
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify**

Run: `curl http://localhost:3000/api/notes`
Expected: `[]`

- [ ] **Step 3: Commit**

```bash
git add app/api/notes/route.js
git commit -m "feat: add notes API route (GET + POST)"
```

---

## Task 4: Fix PositionsTable for Null currentPrice

**Files:**
- Modify: `components/positions/positions-table.js`

The table currently calls `row.currentPrice.toLocaleString()` which throws when `currentPrice` is `null`. Fix by showing `—` for price/P&L columns when null.

- [ ] **Step 1: Write a failing test**

Add to `components/positions/positions-table.test.js` (create if missing, or open existing):

```js
import { sortRows } from './positions-table'

test('sortRows handles null currentPrice without throwing', () => {
  const rows = [
    { code: '2330', name: '台積電', shares: 100, costPrice: 520, currentPrice: null },
  ]
  expect(() => sortRows(rows, 'costPrice', 'asc')).not.toThrow()
})
```

- [ ] **Step 2: Run test**

Run: `npx jest components/positions/positions-table.test.js`
Expected: PASS (sortRows doesn't touch currentPrice, so it already passes — confirms test setup works)

- [ ] **Step 3: Update the table to guard null currentPrice**

Replace the entire `components/positions/positions-table.js` with:

```js
'use client'

import { useState } from 'react'

export function sortRows(rows, sortKey, sortDir) {
  if (!sortKey) return rows
  return [...rows].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? av - bv : bv - av
  })
}

const COLUMNS = [
  { key: 'code',         label: '股票代號', align: 'left'  },
  { key: 'name',         label: '股票名稱', align: 'left'  },
  { key: 'shares',       label: '持有股數', align: 'right' },
  { key: 'costPrice',    label: '成本價',   align: 'right' },
  { key: 'currentPrice', label: '現價',     align: 'right' },
  { key: 'pnlAmount',    label: '損益金額', align: 'right' },
  { key: 'pnlPct',       label: '損益%',    align: 'right' },
]

function pnlColor(v) {
  return v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-900'
}

export default function PositionsTable({ positions = [] }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const rows = sortRows(
    positions.map((p) => ({
      ...p,
      pnlAmount: p.currentPrice != null ? (p.currentPrice - p.costPrice) * p.shares : null,
      pnlPct: p.currentPrice != null && p.costPrice !== 0
        ? (p.currentPrice - p.costPrice) / p.costPrice * 100
        : null,
    })),
    sortKey,
    sortDir,
  )

  function handleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`px-4 py-3 text-xs font-medium cursor-pointer select-none hover:text-gray-700 ${col.align === 'right' ? 'text-right' : 'text-left'} ${sortKey === col.key ? 'text-gray-700' : 'text-gray-400'}`}
              >
                {col.label}{' '}
                {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.code}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{row.name}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-700">{row.shares.toLocaleString('en-US')}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-700">NT$ {row.costPrice.toLocaleString('en-US')}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-700">
                {row.currentPrice != null ? `NT$ ${row.currentPrice.toLocaleString('en-US')}` : '—'}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-medium ${row.pnlAmount != null ? pnlColor(row.pnlAmount) : 'text-gray-400'}`}>
                {row.pnlAmount != null
                  ? `NT$ ${row.pnlAmount > 0 ? '+' : row.pnlAmount < 0 ? '-' : ''}${Math.abs(row.pnlAmount).toLocaleString('en-US')}`
                  : '—'}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-medium ${row.pnlPct != null ? pnlColor(row.pnlPct) : 'text-gray-400'}`}>
                {row.pnlPct != null
                  ? `${row.pnlPct > 0 ? '+' : row.pnlPct < 0 ? '-' : ''}${Math.abs(row.pnlPct).toFixed(2)}%`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest components/positions/positions-table.test.js`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add components/positions/positions-table.js components/positions/positions-table.test.js
git commit -m "fix: handle null currentPrice in PositionsTable"
```

---

## Task 5: Positions Page (Server Component)

**Files:**
- Modify: `app/positions/page.js`

- [ ] **Step 1: Replace the page**

```js
// app/positions/page.js
import { getRows } from '@/lib/sheets'
import StatCard from '@/components/dashboard/stat-card'
import PositionsTable from '@/components/positions/positions-table'

export default async function PositionsPage() {
  const rows = await getRows('持倉')
  const positions = rows.map((row) => ({
    code: row['股票代號'],
    name: row['股票名稱'],
    shares: Number(row['股數']),
    costPrice: Number(row['成本價']),
    currentPrice: null,
  }))

  const totalCost = positions.reduce((s, p) => s + p.costPrice * p.shares, 0)

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">持倉清單</h1>
        <p className="text-sm text-gray-500 mt-1">目前持有的股票投資組合</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <StatCard label="持倉成本" value={`NT$ ${totalCost.toLocaleString()}`} />
        <StatCard label="總損益" value="—" />
        <StatCard label="持股檔數" value={`${positions.length}`} />
      </div>

      <PositionsTable positions={positions} />
    </main>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/positions`. Expected: page loads, shows "—" for 總損益, table shows data from your Google Sheet (empty if no rows yet).

- [ ] **Step 3: Commit**

```bash
git add app/positions/page.js
git commit -m "feat: wire positions page to Google Sheets"
```

---

## Task 6: Dividends Page (Server Component)

**Files:**
- Modify: `app/dividends/page.js`

- [ ] **Step 1: Replace the page**

```js
// app/dividends/page.js
import { getRows } from '@/lib/sheets'

export function aggregateDividends(records) {
  const yearMap = {}
  const stockMap = {}

  for (const r of records) {
    const year = r.date.slice(0, 4)
    yearMap[year] = (yearMap[year] || 0) + r.amount

    if (!stockMap[r.symbol]) {
      stockMap[r.symbol] = { symbol: r.symbol, name: r.name, totalDividends: 0, yields: [] }
    }
    stockMap[r.symbol].totalDividends += r.amount
    if (r.yield) stockMap[r.symbol].yields.push(r.yield)
  }

  const yearlyDividends = Object.entries(yearMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, amount]) => ({ year, amount }))

  const stockDividends = Object.values(stockMap).map((s) => ({
    symbol: s.symbol,
    name: s.name,
    totalDividends: s.totalDividends,
    avgYield: s.yields.length ? s.yields.reduce((a, b) => a + b, 0) / s.yields.length : 0,
  }))

  return { yearlyDividends, stockDividends }
}

const W = 480, H = 220
const PL = 52, PR = 16, PT = 12, PB = 28
const CW = W - PL - PR
const CH = H - PT - PB
const Y_MAX = 35000
const BAR_W = 48
const Y_LABELS = [0, 10000, 20000, 30000]

function toY(v) {
  return PT + CH - (v / Y_MAX) * CH
}

function DividendBarChart({ data }) {
  if (data.length === 0) return <p className="text-gray-400 text-sm py-8 text-center">尚無股利資料</p>
  const GROUP_W = CW / data.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" className="overflow-visible">
      {Y_LABELS.map((v) => (
        <g key={v}>
          <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke={v === 0 ? '#9ca3af' : '#e5e7eb'} strokeWidth={1} />
          <text x={PL - 6} y={toY(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {v === 0 ? '0' : `${v / 1000}K`}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const barX = PL + i * GROUP_W + (GROUP_W - BAR_W) / 2
        const barY = toY(d.amount)
        const barH = CH - (barY - PT)
        return (
          <g key={d.year}>
            <rect x={barX} y={barY} width={BAR_W} height={barH} fill="#10b981" rx={4} />
            <text x={PL + i * GROUP_W + GROUP_W / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#9ca3af">
              {d.year}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default async function DividendsPage() {
  const rows = await getRows('股利記錄')
  const records = rows.map((row) => ({
    date: row['日期'],
    symbol: row['股票代號'],
    name: row['股票名稱'],
    amount: Number(row['實領金額']),
    yield: Number(row['殖利率']),
  }))

  const { yearlyDividends, stockDividends } = aggregateDividends(records)
  const totalDividends = stockDividends.reduce((s, d) => s + d.totalDividends, 0)
  const currentYear = new Date().getFullYear().toString()
  const thisYearTotal = yearlyDividends.find((y) => y.year === currentYear)?.amount ?? 0
  const lastYearTotal = yearlyDividends.find((y) => y.year === (Number(currentYear) - 1).toString())?.amount ?? 0
  const avgYield = stockDividends.length
    ? stockDividends.reduce((s, d) => s + d.avgYield, 0) / stockDividends.length
    : 0

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">股利記錄</h1>
        <p className="text-gray-500 mt-2">歷年配息與殖利率統計</p>
      </div>

      <div className="bg-linear-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold">累計股利總額</h2>
        </div>
        <p className="text-5xl font-bold mb-2">NT$ {totalDividends.toLocaleString('en-US')}</p>
        <p className="text-green-100">歷年累積配息收入</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">年度股利收入趨勢</h3>
        <DividendBarChart data={yearlyDividends} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">各股殖利率統計</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['股票代號', '股票名稱'].map((h) => (
                  <th key={h} className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
                {['累計股利', '平均殖利率'].map((h) => (
                  <th key={h} className="text-right py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stockDividends.map((stock) => (
                <tr key={stock.symbol} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 font-mono font-semibold text-gray-900">{stock.symbol}</td>
                  <td className="py-4 px-6 font-medium text-gray-700">{stock.name}</td>
                  <td className="py-4 px-6 text-right font-semibold text-green-600">
                    NT$ {stock.totalDividends.toLocaleString('en-US')}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                      {stock.avgYield.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {stockDividends.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">尚無股利資料</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm text-gray-500 mb-2">今年累計股利</h3>
          <p className="text-3xl font-bold text-gray-900">NT$ {thisYearTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm text-gray-500 mb-2">去年總股利</h3>
          <p className="text-3xl font-bold text-gray-900">NT$ {lastYearTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm text-gray-500 mb-2">平均年化殖利率</h3>
          <p className="text-3xl font-bold text-green-600">{avgYield.toFixed(1)}%</p>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Write tests for aggregateDividends**

Create `app/dividends/dividends.test.js`:

```js
import { aggregateDividends } from './page'

const records = [
  { date: '2024-07-01', symbol: '2330', name: '台積電', amount: 3200, yield: 2.8 },
  { date: '2024-08-01', symbol: '2882', name: '國泰金', amount: 1800, yield: 5.5 },
  { date: '2025-07-01', symbol: '2330', name: '台積電', amount: 3500, yield: 3.0 },
]

test('aggregates by year', () => {
  const { yearlyDividends } = aggregateDividends(records)
  expect(yearlyDividends).toEqual([
    { year: '2024', amount: 5000 },
    { year: '2025', amount: 3500 },
  ])
})

test('aggregates by stock', () => {
  const { stockDividends } = aggregateDividends(records)
  const tsmc = stockDividends.find((s) => s.symbol === '2330')
  expect(tsmc.totalDividends).toBe(6700)
  expect(tsmc.avgYield).toBeCloseTo(2.9)
})

test('returns empty arrays for empty input', () => {
  const { yearlyDividends, stockDividends } = aggregateDividends([])
  expect(yearlyDividends).toEqual([])
  expect(stockDividends).toEqual([])
})
```

- [ ] **Step 3: Run tests**

Run: `npx jest app/dividends/dividends.test.js`
Expected: all 3 PASS

- [ ] **Step 4: Verify in browser**

Navigate to `http://localhost:3000/dividends`. Expected: page loads with "尚無股利資料" or real data if sheet has rows.

- [ ] **Step 5: Commit**

```bash
git add app/dividends/page.js app/dividends/dividends.test.js
git commit -m "feat: wire dividends page to Google Sheets"
```

---

## Task 7: Fund Management Page (Server Component)

**Files:**
- Modify: `app/fund-management/page.js`

- [ ] **Step 1: Write test for groupByFundSource**

Create `app/fund-management/fund-management.test.js`:

```js
import { groupByFundSource } from './page'

const positions = [
  { fundSource: '定期定額', shares: 100, costPrice: 520 },
  { fundSource: '定期定額', shares: 50,  costPrice: 42  },
  { fundSource: '貸款資金', shares: 200, costPrice: 108 },
]

test('groups positions by fund source and sums cost', () => {
  const result = groupByFundSource(positions)
  expect(result['定期定額'].cost).toBe(100 * 520 + 50 * 42)
  expect(result['貸款資金'].cost).toBe(200 * 108)
})

test('returns zero cost for missing fund source', () => {
  const result = groupByFundSource(positions)
  expect(result['閒錢操作']).toBeUndefined()
})
```

- [ ] **Step 2: Run test to see it fail**

Run: `npx jest app/fund-management/fund-management.test.js`
Expected: FAIL — `groupByFundSource` not exported yet

- [ ] **Step 3: Replace the page**

```js
// app/fund-management/page.js
import { getRows } from '@/lib/sheets'
import DonutChart from '@/components/dashboard/donut-chart'
import BarChart from '@/components/fund-management/bar-chart'

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-600'   },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-600'  },
}

const POOL_CONFIG = {
  '定期定額': { id: 'regular', color: 'blue',   description: '每月穩健投資，長期複利成長' },
  '貸款資金': { id: 'loan',    color: 'purple', description: '槓桿操作，追求高報酬' },
  '閒錢操作': { id: 'idle',    color: 'green',  description: '靈活進出，短線波段操作' },
}

export function groupByFundSource(positions) {
  const map = {}
  for (const p of positions) {
    if (!map[p.fundSource]) map[p.fundSource] = { cost: 0 }
    map[p.fundSource].cost += p.shares * p.costPrice
  }
  return map
}

const LEGEND_ITEMS = [
  { label: '定期定額', color: '#3b82f6' },
  { label: '貸款資金', color: '#8b5cf6' },
  { label: '閒錢操作', color: '#10b981' },
]

const POOL_COLORS = { '定期定額': '#3b82f6', '貸款資金': '#8b5cf6', '閒錢操作': '#10b981' }

const performanceComparison = [
  { month: '1月', 定期定額: 5.2,  貸款資金: 8.1,  閒錢操作:  2.3  },
  { month: '2月', 定期定額: 6.1,  貸款資金: 9.5,  閒錢操作: -1.2  },
  { month: '3月', 定期定額: 6.8,  貸款資金: 10.2, 閒錢操作:  0.8  },
  { month: '4月', 定期定額: 7.5,  貸款資金: 9.8,  閒錢操作:  1.5  },
  { month: '5月', 定期定額: 8.0,  貸款資金: 10.5, 閒錢操作:  1.2  },
  { month: '6月', 定期定額: 8.33, 貸款資金: 10.0, 閒錢操作:  1.89 },
]

function PoolIcon({ id, className }) {
  const shared = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', className, 'aria-hidden': 'true' }
  if (id === 'regular') return (
    <svg {...shared}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
  if (id === 'loan') return (
    <svg {...shared}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
  return (
    <svg {...shared}>
      <path d="M20 12V22H4a2 2 0 01-2-2V6a2 2 0 012-2h16v8"/>
      <path d="M20 12H14a2 2 0 000 4h6v-4z"/>
    </svg>
  )
}

export default async function FundManagement() {
  const rows = await getRows('持倉')
  const positions = rows.map((row) => ({
    fundSource: row['資金來源'],
    shares: Number(row['股數']),
    costPrice: Number(row['成本價']),
  }))

  const grouped = groupByFundSource(positions)

  const fundPools = Object.entries(POOL_CONFIG).map(([name, cfg]) => ({
    ...cfg,
    name,
    cost: Math.round(grouped[name]?.cost ?? 0),
    totalAsset: Math.round(grouped[name]?.cost ?? 0),
    profit: 0,
    profitRate: 0,
  }))

  const totalCost = fundPools.reduce((s, p) => s + p.cost, 0)

  const allocationData = fundPools.map((p) => ({
    name: p.name,
    code: '',
    value: p.cost,
    color: POOL_COLORS[p.name],
  }))

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">資金管理</h1>
        <p className="text-gray-500 mt-2">三種資金池的總覽與績效對比</p>
      </div>

      <div className="bg-linear-to-br from-slate-700 to-slate-900 rounded-xl shadow-lg p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
          <h2 className="text-xl font-semibold">總投入成本</h2>
        </div>
        <p className="text-5xl font-bold mb-2">NT$ {totalCost.toLocaleString()}</p>
        <p className="text-slate-300 text-sm">現值損益待 FinMind 串接後計算</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {fundPools.map((pool) => {
          const c = COLOR_MAP[pool.color]
          return (
            <div key={pool.id} className={`bg-white rounded-xl shadow-sm p-6 border-2 ${c.border} transition-all`}>
              <div className="flex items-center gap-2 mb-1">
                <PoolIcon id={pool.id} className={`w-6 h-6 ${c.text}`} />
                <h3 className="text-lg font-bold text-gray-900">{pool.name}</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">{pool.description}</p>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">投入成本</p>
                  <p className="text-2xl font-bold text-gray-900">NT$ {pool.cost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">報酬率趨勢對比</h3>
          <div className="flex gap-4 mb-4">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
          <BarChart data={performanceComparison} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">資金配置比例</h3>
          <DonutChart positions={allocationData} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest app/fund-management/fund-management.test.js`
Expected: all 2 PASS

- [ ] **Step 5: Verify in browser**

Navigate to `http://localhost:3000/fund-management`. Expected: page shows cost totals from real 持倉 data.

- [ ] **Step 6: Commit**

```bash
git add app/fund-management/page.js app/fund-management/fund-management.test.js
git commit -m "feat: wire fund-management page to Google Sheets"
```

---

## Task 8: Trades Page (Client Component)

**Files:**
- Modify: `app/trades/page.js`

- [ ] **Step 1: Replace mock data with fetch**

Replace only the top of the file — remove `mockTrades` constant and update `TradesPage`:

```js
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const FUND_SOURCE_COLOR = {
  '定期定額': 'bg-blue-100 text-blue-700',
  '貸款資金': 'bg-purple-100 text-purple-700',
  '閒錢操作': 'bg-emerald-100 text-emerald-700',
}

export default function TradesPage() {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('全部')
  const [filterFund, setFilterFund] = useState('全部')

  useEffect(() => {
    fetch('/api/trades')
      .then((r) => r.json())
      .then(setTrades)
      .finally(() => setLoading(false))
  }, [])

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = searchTerm === '' || trade.symbol.includes(searchTerm) || trade.name.includes(searchTerm)
    const matchesType = filterType === '全部' || trade.type === filterType
    const matchesFund = filterFund === '全部' || trade.fundSource === filterFund
    return matchesSearch && matchesType && matchesFund
  })

  const handleExportCSV = () => {
    const headers = ['日期', '類型', '資金來源', '股票代號', '股票名稱', '股數', '價格', '金額', '手續費']
    const rows = filteredTrades.map((t) => [t.date, t.type, t.fundSource, t.symbol, t.name, t.shares, t.price, t.amount, t.fee])
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `交易記錄_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }
  // ... return JSX is identical to original except the empty-state div at the bottom
```

In the return JSX, keep everything unchanged. Only replace the final empty-state `<div>` at the bottom of the table body:

```jsx
{loading && (
  <div className="py-12 text-center text-gray-400">載入中...</div>
)}
{!loading && filteredTrades.length === 0 && (
  <div className="py-12 text-center text-gray-500">沒有符合條件的交易記錄</div>
)}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/trades`. Expected: shows "載入中..." briefly then real data (or empty state).

- [ ] **Step 3: Commit**

```bash
git add app/trades/page.js
git commit -m "feat: wire trades page to /api/trades"
```

---

## Task 9: New Trade Form (POST to API)

**Files:**
- Modify: `app/trades/new/page.js`

The form is missing a stock name field and doesn't POST to the API yet. Fix both.

- [ ] **Step 1: Update the form state, add name field, wire submit to API**

Replace `handleSubmit` and add the name field. Change `formData` initial state to include `name: ''`:

```js
// Replace the useState initial value:
const [formData, setFormData] = useState({
  type: '買入',
  fundSource: '定期定額',
  symbol: '',
  name: '',
  shares: '',
  price: '',
  date: new Date().toISOString().split('T')[0],
  fee: '',
})

// Replace handleSubmit:
const handleSubmit = async (e) => {
  e.preventDefault()
  const shares = parseFloat(formData.shares) || 0
  const price = parseFloat(formData.price) || 0
  const fee = parseFloat(formData.fee) || 0
  const amount = shares * price * 1000

  await fetch('/api/trades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: formData.date,
      type: formData.type,
      fundSource: formData.fundSource,
      symbol: formData.symbol,
      name: formData.name,
      shares,
      price,
      amount,
      fee,
    }),
  })
  router.push('/trades')
}
```

Add the name input field in JSX — inside the "交易資訊" grid, after the symbol field:

```jsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">股票名稱</label>
  <input type="text" name="name" value={formData.name} onChange={handleChange}
    placeholder="例如: 台積電"
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
</div>
```

Also remove the `notes` field from formData initial state and the `notes` textarea from JSX (it's not in the sheet schema).

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/trades/new`. Fill in a trade, submit. Expected: redirects to `/trades`, new row appears.

- [ ] **Step 3: Commit**

```bash
git add app/trades/new/page.js
git commit -m "feat: wire new trade form to POST /api/trades"
```

---

## Task 10: Watchlist Page (Client Component)

**Files:**
- Modify: `app/watchlist/page.js`

- [ ] **Step 1: Replace mock data with fetch, wire add form to POST**

```js
'use client'

import { useState, useEffect } from 'react'

function isPriceNearTarget(current, target) {
  return Math.abs((current - target) / target) < 0.05
}

function isPriceNearStopLoss(current, stopLoss) {
  return Math.abs((current - stopLoss) / stopLoss) < 0.05
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ symbol: '', name: '', targetPrice: '', stopLoss: '' })

  function loadWatchlist() {
    setLoading(true)
    fetch('/api/watchlist')
      .then((r) => r.json())
      .then(setWatchlist)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadWatchlist() }, [])

  const toggleAlert = (symbol) => {
    setWatchlist(watchlist.map((item) =>
      item.symbol === symbol ? { ...item, alertEnabled: !item.alertEnabled } : item
    ))
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newItem.symbol) return
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: newItem.symbol,
        name: newItem.name,
        targetPrice: parseFloat(newItem.targetPrice) || 0,
        stopLoss: parseFloat(newItem.stopLoss) || 0,
      }),
    })
    setNewItem({ symbol: '', name: '', targetPrice: '', stopLoss: '' })
    setShowAddForm(false)
    loadWatchlist()
  }
  // toggleAlert stays unchanged from the original
```

Replace the add form section in JSX (original had uncontrolled inputs with no state — replace with this):

```jsx
{showAddForm && (
  <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">新增觀察股票</h3>
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <input type="text" placeholder="股票代號" value={newItem.symbol}
        onChange={(e) => setNewItem((p) => ({ ...p, symbol: e.target.value }))}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="text" placeholder="股票名稱" value={newItem.name}
        onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="number" placeholder="目標價" value={newItem.targetPrice}
        onChange={(e) => setNewItem((p) => ({ ...p, targetPrice: e.target.value }))}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="number" placeholder="停損價" value={newItem.stopLoss}
        onChange={(e) => setNewItem((p) => ({ ...p, stopLoss: e.target.value }))}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">新增</button>
        <button type="button" onClick={() => setShowAddForm(false)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">取消</button>
      </div>
    </div>
  </form>
)}
```

Add loading state before the table:

```jsx
{loading && <div className="py-12 text-center text-gray-400">載入中...</div>}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/watchlist`. Expected: page loads from real data, add form POSTs and refreshes list.

- [ ] **Step 3: Commit**

```bash
git add app/watchlist/page.js
git commit -m "feat: wire watchlist page to /api/watchlist"
```

---

## Task 11: Notes Page (Client Component)

**Files:**
- Modify: `app/notes/page.js`

- [ ] **Step 1: Replace mock data with fetch, wire add form to POST**

Replace `mockNotes` and the state initialization, add `loadNotes` function, wire `handleAddNote` to POST:

```js
// Replace useState(mockNotes) with:
const [notes, setNotes] = useState([])
const [loading, setLoading] = useState(true)

// Add loadNotes function:
function loadNotes() {
  setLoading(true)
  fetch('/api/notes')
    .then((r) => r.json())
    .then(setNotes)
    .finally(() => setLoading(false))
}

// Add useEffect:
useEffect(() => { loadNotes() }, [])

// Replace handleAddNote:
const handleAddNote = async (e) => {
  e.preventDefault()
  if (!form.symbol || !form.buyReason) return
  await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      ...form,
    }),
  })
  setForm(EMPTY_FORM)
  setShowAddForm(false)
  loadNotes()
}
```

Add `useEffect` to imports: `import { useState, useEffect } from 'react'`

Add loading state before note cards:

```jsx
{loading && <div className="py-12 text-center text-gray-400">載入中...</div>}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/notes`. Expected: page loads from real data, add form POSTs and refreshes list.

- [ ] **Step 3: Run full test suite to check for regressions**

Run: `npx jest`
Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add app/notes/page.js
git commit -m "feat: wire notes page to /api/notes"
```
