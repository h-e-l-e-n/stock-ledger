# 持倉清單 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作 `/positions` 持倉清單頁面，含 3 個 StatCard 摘要和可排序的持股明細表格，使用假資料。

**Architecture:** `app/positions/page.js` 是 Server Component，提供 mock data 並計算摘要數字。`components/positions/positions-table.js` 是 `'use client'` component，封裝 `useState` 排序邏輯。排序邏輯抽成純函式 `sortRows` 以便測試。

**Tech Stack:** Next.js 16.2.7 App Router、React 19、Tailwind CSS v4、Jest（`npm test`）

> ⚠️ **Before writing any code:** Read `node_modules/next/dist/docs/` for relevant App Router conventions. Tailwind v4 uses `shrink-0` not `flex-shrink-0`.

---

## File Structure

```
components/positions/
  positions-table.js         ← create: 'use client', sortRows export + PositionsTable component
  positions-table.test.js    ← create: unit tests for sortRows
app/positions/page.js        ← modify: replace skeleton with full page
```

Reused (do not modify): `components/dashboard/stat-card.js`

---

## Task 1: `sortRows` 純函式 + 單元測試

**Files:**
- Create: `components/positions/positions-table.js`
- Create: `components/positions/positions-table.test.js`

- [ ] **Step 1: 建立測試檔**

```js
// components/positions/positions-table.test.js
import { sortRows } from './positions-table'

const rows = [
  { code: '2330', name: '台積電', shares: 100, costPrice: 520,  currentPrice: 580,  pnlAmount: 6000,  pnlPct: 11.54 },
  { code: '2317', name: '鴻海',   shares: 200, costPrice: 108,  currentPrice: 105,  pnlAmount: -600,  pnlPct: -2.78 },
  { code: '2454', name: '聯發科', shares: 50,  costPrice: 1050, currentPrice: 1120, pnlAmount: 3500,  pnlPct: 6.67  },
]

describe('sortRows', () => {
  test('sortKey null 時回傳原陣列', () => {
    expect(sortRows(rows, null, 'asc')).toBe(rows)
  })

  test('數值欄位 asc 排序', () => {
    const result = sortRows(rows, 'pnlAmount', 'asc')
    expect(result[0].code).toBe('2317')  // -600
    expect(result[1].code).toBe('2454')  // 3500
    expect(result[2].code).toBe('2330')  // 6000
  })

  test('數值欄位 desc 排序', () => {
    const result = sortRows(rows, 'pnlAmount', 'desc')
    expect(result[0].code).toBe('2330')  // 6000
    expect(result[2].code).toBe('2317')  // -600
  })

  test('字串欄位 (code) asc 排序', () => {
    const result = sortRows(rows, 'code', 'asc')
    expect(result[0].code).toBe('2317')
    expect(result[1].code).toBe('2330')
    expect(result[2].code).toBe('2454')
  })

  test('字串欄位 (code) desc 排序', () => {
    const result = sortRows(rows, 'code', 'desc')
    expect(result[0].code).toBe('2454')
    expect(result[2].code).toBe('2317')
  })

  test('不改變原陣列', () => {
    const original = [rows[0].code, rows[1].code, rows[2].code]
    sortRows(rows, 'pnlAmount', 'asc')
    expect(rows[0].code).toBe(original[0])
    expect(rows[1].code).toBe(original[1])
    expect(rows[2].code).toBe(original[2])
  })
})
```

- [ ] **Step 2: 執行測試，確認 FAIL**

```bash
npm test -- --testPathPattern=positions-table
```

Expected: FAIL with `Cannot find module './positions-table'`

- [ ] **Step 3: 建立 positions-table.js，只含 sortRows**

```js
// components/positions/positions-table.js
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
```

（暫時只匯出 `sortRows`，Task 2 補上 component。）

- [ ] **Step 4: 執行測試，確認 6 個全 PASS**

```bash
npm test -- --testPathPattern=positions-table
```

Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add components/positions/positions-table.js components/positions/positions-table.test.js
git commit -m "feat: add sortRows function with unit tests"
```

---

## Task 2: PositionsTable 'use client' Component

**Files:**
- Modify: `components/positions/positions-table.js`

- [ ] **Step 1: 補上完整 component，追加到 positions-table.js 現有內容之後**

將整個檔案改成以下內容（保留 `sortRows`，新增 component）：

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

export default function PositionsTable({ positions }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const rows = sortRows(
    positions.map((p) => ({
      ...p,
      pnlAmount: (p.currentPrice - p.costPrice) * p.shares,
      pnlPct: (p.currentPrice - p.costPrice) / p.costPrice * 100,
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
              <td className="px-4 py-3 text-sm text-right text-gray-700">{row.shares.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-700">NT$ {row.costPrice.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-700">NT$ {row.currentPrice.toLocaleString()}</td>
              <td className={`px-4 py-3 text-sm text-right font-medium ${pnlColor(row.pnlAmount)}`}>
                NT$ {row.pnlAmount > 0 ? '+' : row.pnlAmount < 0 ? '-' : ''}{Math.abs(row.pnlAmount).toLocaleString()}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-medium ${pnlColor(row.pnlPct)}`}>
                {row.pnlPct > 0 ? '+' : row.pnlPct < 0 ? '-' : ''}{Math.abs(row.pnlPct).toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: 確認測試仍然全 PASS（sortRows 未改動）**

```bash
npm test -- --testPathPattern=positions-table
```

Expected: 6 passed

- [ ] **Step 3: Build 確認無錯誤**

```bash
npx next build 2>&1 | grep -E 'error|Error|✓|✗'
```

Expected: 沒有 error，看到 `✓ Compiled`

- [ ] **Step 4: Commit**

```bash
git add components/positions/positions-table.js
git commit -m "feat: add PositionsTable component with interactive sorting"
```

---

## Task 3: 持倉清單 Page

**Files:**
- Modify: `app/positions/page.js`

- [ ] **Step 1: 替換 page.js 全部內容**

```js
import StatCard from '@/components/dashboard/stat-card'
import PositionsTable from '@/components/positions/positions-table'

const mockPositions = [
  { code: '2317', name: '鴻海',   shares: 200, costPrice: 108,  currentPrice: 105  },
  { code: '2330', name: '台積電', shares: 100, costPrice: 520,  currentPrice: 580  },
  { code: '2412', name: '中華電', shares: 80,  costPrice: 118,  currentPrice: 120  },
  { code: '2454', name: '聯發科', shares: 50,  costPrice: 1050, currentPrice: 1120 },
  { code: '2882', name: '國泰金', shares: 150, costPrice: 42,   currentPrice: 45   },
]

export default function PositionsPage() {
  const totalValue = mockPositions.reduce((s, p) => s + p.currentPrice * p.shares, 0)
  const totalPnl = mockPositions.reduce((s, p) => s + (p.currentPrice - p.costPrice) * p.shares, 0)
  const pnlPct = (totalPnl / (totalValue - totalPnl)) * 100
  const pnlSign = totalPnl >= 0 ? '+' : '-'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">持倉清單</h1>
        <p className="text-sm text-gray-500 mt-1">目前持有的股票投資組合</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <StatCard label="持倉總市值" value={`NT$ ${totalValue.toLocaleString()}`} />
        <StatCard
          label="總損益"
          value={`NT$ ${pnlSign}${Math.abs(totalPnl).toLocaleString()}`}
          change={pnlPct}
        />
        <StatCard label="持股檔數" value={`${mockPositions.length}`} />
      </div>

      <PositionsTable positions={mockPositions} />
    </div>
  )
}
```

- [ ] **Step 2: Build 確認無錯誤**

```bash
npx next build 2>&1 | grep -E 'error|Error|✓|✗|positions'
```

Expected: `○ /positions` 出現在路由列表，沒有 error

- [ ] **Step 3: 執行全部測試確認沒有 regression**

```bash
npm test
```

Expected: 所有測試（含 donut-chart 的 7 個）全 PASS

- [ ] **Step 4: Commit**

```bash
git add app/positions/page.js
git commit -m "feat: add 持倉清單 page with stat cards and sortable table"
```
