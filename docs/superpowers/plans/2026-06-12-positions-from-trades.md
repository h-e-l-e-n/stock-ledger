# Positions from Trades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute positions dynamically from 交易記錄 so the positions list, fund management page, and dashboard always reflect actual trade history without needing manual 持倉 sheet maintenance.

**Architecture:** New pure function `aggregateTrades(trades)` in `lib/positions.js` applies weighted-average-cost accounting to a list of trades and returns current open positions grouped by (symbol, fundSource). Three server pages that previously read from the `持倉` sheet are updated to read `交易記錄` and call `aggregateTrades` instead.

**Tech Stack:** Next.js App Router, `lib/sheets.js` (`getRows`), Jest

---

## File Map

New:
- `lib/positions.js` — exports `aggregateTrades(trades)`
- `lib/positions.test.js` — 7 unit tests for `aggregateTrades`

Modified:
- `app/positions/page.js` — replace `getRows('持倉')` with `getRows('交易記錄')` + `aggregateTrades`
- `app/fund-management/page.js` — same replacement
- `app/page.js` — same replacement, also drops the parallel `getRows('持倉')` call (trades sheet is now the only sheet read)

---

## Context

### Trade record shape (from `交易記錄` sheet)

```
日期 | 類型 | 資金來源 | 股票代號 | 股票名稱 | 股數 | 價格 | 金額 | 手續費
```

`金額` = `價格 × 股數` (pre-computed in the sheet).

### `aggregateTrades` output shape

```js
{ code, name, fundSource, shares, costPrice }[]
```

One row per (symbol, fundSource) combination. Positions with shares ≤ 0 are excluded.

### Weighted average cost algorithm

For each (symbol, fundSource) group, process trades sorted by date ascending:

- **買入:** `shares += trade.shares`; `totalCost += trade.amount + trade.fee`; `costPrice = totalCost / shares`
- **賣出:** `prevShares = shares`; `shares -= trade.shares`; `totalCost = totalCost * shares / prevShares` ← keeps costPrice unchanged

### Pages that currently read `持倉`

| Page | Lines to change |
|------|----------------|
| `app/positions/page.js:11-17` | Replace sheet read + row mapping |
| `app/fund-management/page.js:77-83` | Replace sheet read + row mapping |
| `app/page.js:46-57` | Replace parallel sheet reads + posRows mapping |

### `groupByFundSource` in fund-management uses `p.code`, `p.fundSource`, `p.shares`, `p.costPrice` — all present in `aggregateTrades` output, no changes needed to that function.

### Dashboard `computeDashboardStats` and `toDonutPositions` both use `p.code`, `p.name`, `p.fundSource`, `p.shares`, `p.costPrice` — all present, no changes needed.

### Run tests with: `npx jest`

---

## Task 1: `lib/positions.js` — aggregation function

**Files:**
- Create: `lib/positions.js`
- Create: `lib/positions.test.js`

- [ ] **Step 1: Write the failing tests**

Create `lib/positions.test.js`:

```js
import { aggregateTrades } from './positions'

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

describe('aggregateTrades', () => {
  test('single buy → correct code, name, fundSource, shares, costPrice', () => {
    const [pos] = aggregateTrades([t()])
    expect(pos.code).toBe('2330')
    expect(pos.name).toBe('台積電')
    expect(pos.fundSource).toBe('閒錢操作')
    expect(pos.shares).toBe(10)
    expect(pos.costPrice).toBeCloseTo((1000 + 10) / 10) // 101
  })

  test('two buys same symbol+fundSource → weighted average cost', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-01-02', shares: 5,  amount: 600,  fee: 5  }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].shares).toBe(15)
    // totalCost = 1010 + 605 = 1615; costPrice = 1615/15
    expect(result[0].costPrice).toBeCloseTo(1615 / 15)
  })

  test('buy then sell → remaining shares, costPrice unchanged', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-01-02', type: '賣出', shares: 3, amount: 330, fee: 5 }),
    ])
    expect(result[0].shares).toBe(7)
    // totalCost after sell = 1010 * 7/10 = 707; costPrice = 707/7 = 101 (unchanged)
    expect(result[0].costPrice).toBeCloseTo(1010 / 10)
  })

  test('fully sold → excluded from output', () => {
    const result = aggregateTrades([
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
      t({ date: '2026-01-02', type: '賣出', shares: 10, amount: 1100, fee: 5 }),
    ])
    expect(result).toHaveLength(0)
  })

  test('same symbol, different fundSource → two separate rows', () => {
    const result = aggregateTrades([
      t({ fundSource: '定期定額' }),
      t({ fundSource: '閒錢操作' }),
    ])
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.fundSource).sort()).toEqual(['定期定額', '閒錢操作'])
  })

  test('fee included in cost basis', () => {
    const [pos] = aggregateTrades([t({ shares: 10, amount: 1000, fee: 50 })])
    expect(pos.costPrice).toBeCloseTo((1000 + 50) / 10) // 105
  })

  test('processes trades in date order regardless of input order', () => {
    const result = aggregateTrades([
      // sell is first in array but dated later — must be applied after the buy
      t({ date: '2026-01-02', type: '賣出', shares: 3, amount: 330, fee: 5 }),
      t({ date: '2026-01-01', shares: 10, amount: 1000, fee: 10 }),
    ])
    expect(result[0].shares).toBe(7)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/positions.test.js
```

Expected: FAIL — `Cannot find module './positions'`

- [ ] **Step 3: Implement `lib/positions.js`**

```js
export function aggregateTrades(trades) {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  const groups = new Map()

  for (const trade of sorted) {
    const key = `${trade.symbol}|${trade.fundSource}`
    if (!groups.has(key)) {
      groups.set(key, { code: trade.symbol, name: trade.name, fundSource: trade.fundSource, shares: 0, totalCost: 0 })
    }
    const pos = groups.get(key)
    pos.name = trade.name

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

- [ ] **Step 4: Run new tests to verify they pass**

```bash
npx jest lib/positions.test.js
```

Expected: 7 tests pass

- [ ] **Step 5: Run full test suite**

```bash
npx jest
```

Expected: 52 tests pass across 8 suites (45 existing + 7 new)

- [ ] **Step 6: Commit**

```bash
git add lib/positions.js lib/positions.test.js
git commit -m "feat: add aggregateTrades for computing positions from trade history"
```

---

## Task 2: `app/positions/page.js` — read from trades

**Files:**
- Modify: `app/positions/page.js`

- [ ] **Step 1: Replace the data fetching block**

Current file at `/Users/helen/Desktop/stock-ledger/app/positions/page.js`:

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
  // ... rest unchanged
```

Replace with:

```js
import { getRows } from '@/lib/sheets'
import { getPrices } from '@/lib/prices'
import { aggregateTrades } from '@/lib/positions'
import StatCard from '@/components/dashboard/stat-card'
import PositionsTable from '@/components/positions/positions-table'

export const dynamic = 'force-dynamic'

export default async function PositionsPage() {
  let positions = []
  try {
    const rows = await getRows('交易記錄')
    const trades = rows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']),
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))
    const rawPositions = aggregateTrades(trades)

    const symbols = [...new Set(rawPositions.map((p) => p.code))]
    const prices = symbols.length > 0 ? await getPrices(symbols) : {}

    positions = rawPositions.map((p) => ({
      ...p,
      currentPrice: prices[p.code]?.price ?? null,
    }))
  } catch (err) {
    console.error('Failed to load positions:', err.message)
  }
  // ... rest unchanged
```

- [ ] **Step 2: Run full test suite**

```bash
npx jest
```

Expected: 52 tests pass (no regressions)

- [ ] **Step 3: Commit**

```bash
git add app/positions/page.js
git commit -m "feat: compute positions from trade history on positions page"
```

---

## Task 3: `app/fund-management/page.js` — read from trades

**Files:**
- Modify: `app/fund-management/page.js`

- [ ] **Step 1: Replace the data fetching block**

Add import at top of file (after existing imports):

```js
import { aggregateTrades } from '@/lib/positions'
```

Replace lines 77–86 (the try block inside `FundManagement`):

```js
// current:
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
```

```js
// replacement:
  try {
    const rows = await getRows('交易記錄')
    const trades = rows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']),
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))
    positions = aggregateTrades(trades)
  } catch (err) {
    console.error('Failed to load positions for fund management:', err.message)
  }
```

Everything below that block (`symbols`, `prices`, `grouped`, `fundPools`, JSX) is unchanged.

- [ ] **Step 2: Run full test suite**

```bash
npx jest
```

Expected: 52 tests pass (no regressions)

- [ ] **Step 3: Commit**

```bash
git add app/fund-management/page.js
git commit -m "feat: compute positions from trade history on fund management page"
```

---

## Task 4: `app/page.js` — read from trades

**Files:**
- Modify: `app/page.js`

- [ ] **Step 1: Replace the data fetching block**

Add import at top of file (after existing imports):

```js
import { aggregateTrades } from '@/lib/positions'
```

The current try block (lines 45–77) reads `持倉` and `交易記錄` in parallel. Replace the entire try block:

```js
// current:
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
```

```js
// replacement:
  try {
    const tradeRows = await getRows('交易記錄')
    const trades = tradeRows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']),
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))
    const rawPositions = aggregateTrades(trades)

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
```

Everything after the try/catch (`computeDashboardStats`, `toDonutPositions`, JSX) is unchanged.

- [ ] **Step 2: Run full test suite**

```bash
npx jest
```

Expected: 52 tests pass (no regressions; dashboard tests for `computeDashboardStats` and `toDonutPositions` are unaffected since those pure functions are unchanged)

- [ ] **Step 3: Commit**

```bash
git add app/page.js
git commit -m "feat: compute positions from trade history on dashboard"
```
