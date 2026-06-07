# Dashboard 切版實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作 Dashboard 頁面版型，包含更新 Nav、StatCard、DonutChart、TradesTable 四個 component，全部使用假資料。

**Architecture:** Next.js 16 App Router，所有新 component 皆為 Server Components（無 `'use client'`）。DonutChart 使用純 SVG，路徑計算邏輯以 export 函式暴露供測試。Nav 維持現有 `'use client'`。

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Jest

---

## File Map

```
components/
  nav.js                              ← 修改：改標題、加圖示
  dashboard/
    stat-card.js                      ← 新增：資產淨值 / 今日損益卡片
    donut-chart.js                    ← 新增：持倉概況 SVG Donut 圖
    donut-chart.test.js               ← 新增：SVG 路徑計算單元測試
    trades-table.js                   ← 新增：近期交易記錄表格
app/
  page.js                             ← 修改：組合所有 component + mock data
```

---

## Task 1：更新 Nav — 圖示 + 中文標題

**Files:**
- Modify: `components/nav.js`

- [ ] **Step 1：更新 `components/nav.js`**

完整替換檔案內容：

```jsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  {
    href: '/',
    label: '總覽',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/positions',
    label: '持倉清單',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: '/trades',
    label: '交易記錄',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/performance',
    label: '績效分析',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: '/dividends',
    label: '股利記錄',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
  {
    href: '/watchlist',
    label: '觀察清單',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
  {
    href: '/notes',
    label: '交易筆記',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
  },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <nav className="w-56 min-h-screen bg-gray-900 text-white flex flex-col p-4 gap-1 shrink-0">
      <span className="text-lg font-bold mb-6 px-2">股票記錄系統</span>
      {links.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            pathname === href
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          {icon}
          {label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2：Commit**

```bash
git add components/nav.js
git commit -m "feat: update nav with icons and Chinese title"
```

---

## Task 2：StatCard component

**Files:**
- Create: `components/dashboard/stat-card.js`

StatCard 是純展示元件，邏輯只有正/負值顏色切換，以視覺驗證取代單元測試。

- [ ] **Step 1：建立 `components/dashboard/stat-card.js`**

```jsx
export default function StatCard({ label, value, change }) {
  const isPositive = change > 0
  const isNegative = change < 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <p className={`text-3xl font-extrabold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
        {change != null && (
          <span className={`inline-flex items-center gap-1 text-sm font-semibold ml-2 align-middle ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {isPositive
                ? <polyline points="18 15 12 9 6 15"/>
                : <polyline points="6 9 12 15 18 9"/>
              }
            </svg>
            {Math.abs(change)}%
          </span>
        )}
      </p>
    </div>
  )
}
```

- [ ] **Step 2：Commit**

```bash
git add components/dashboard/stat-card.js
git commit -m "feat: add StatCard component"
```

---

## Task 3：DonutChart component（含單元測試）

**Files:**
- Create: `components/dashboard/donut-chart.js`
- Create: `components/dashboard/donut-chart.test.js`

DonutChart 內含 SVG 路徑計算邏輯，以 export 函式暴露供測試。

- [ ] **Step 1：寫 failing test**

建立 `components/dashboard/donut-chart.test.js`：

```js
import { polarToCartesian, buildSegments } from './donut-chart'

describe('polarToCartesian', () => {
  test('0° points to top (12 o\'clock)', () => {
    const pt = polarToCartesian(50, 50, 45, 0)
    expect(pt.x).toBeCloseTo(50, 1)
    expect(pt.y).toBeCloseTo(5, 1)   // cy - r = 50 - 45 = 5
  })

  test('90° points to right', () => {
    const pt = polarToCartesian(50, 50, 45, 90)
    expect(pt.x).toBeCloseTo(95, 1)  // cx + r = 50 + 45 = 95
    expect(pt.y).toBeCloseTo(50, 1)
  })
})

describe('buildSegments', () => {
  const positions = [
    { name: '台積電', code: '2330', value: 450000, color: '#4f46e5' },
    { name: '聯發科', code: '2454', value: 450000, color: '#7c3aed' },
  ]

  test('returns one segment per position', () => {
    const segs = buildSegments(positions)
    expect(segs).toHaveLength(2)
  })

  test('percentages sum to 100', () => {
    const segs = buildSegments(positions)
    const total = segs.reduce((s, seg) => s + seg.pct, 0)
    expect(total).toBeCloseTo(100, 5)
  })

  test('equal values produce 50% each', () => {
    const segs = buildSegments(positions)
    expect(segs[0].pct).toBeCloseTo(50, 5)
    expect(segs[1].pct).toBeCloseTo(50, 5)
  })

  test('each segment has a non-empty d path string', () => {
    const segs = buildSegments(positions)
    segs.forEach(seg => {
      expect(typeof seg.d).toBe('string')
      expect(seg.d.length).toBeGreaterThan(0)
    })
  })

  test('handles single position (100%)', () => {
    const segs = buildSegments([positions[0]])
    expect(segs).toHaveLength(1)
    expect(segs[0].pct).toBeCloseTo(100, 5)
  })
})
```

- [ ] **Step 2：執行測試確認 FAIL**

```bash
npm test components/dashboard/donut-chart.test.js
```

Expected: FAIL — `Cannot find module './donut-chart'`

- [ ] **Step 3：建立 `components/dashboard/donut-chart.js`**

```jsx
const CX = 50, CY = 50, R = 45, INNER_R = 28

export function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function buildSegments(positions) {
  const total = positions.reduce((s, p) => s + p.value, 0)
  let startAngle = 0
  return positions.map((pos) => {
    const pct = (pos.value / total) * 100
    const sweep = (pct / 100) * 360
    const endAngle = startAngle + sweep
    const start = polarToCartesian(CX, CY, R, startAngle)
    const end = polarToCartesian(CX, CY, R, endAngle)
    const largeArc = sweep > 180 ? 1 : 0
    const d = `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
    startAngle = endAngle
    return { ...pos, pct, d }
  })
}

export default function DonutChart({ positions }) {
  const segments = buildSegments(positions)
  const total = positions.reduce((s, p) => s + p.value, 0)

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="200" viewBox="0 0 100 100">
        {segments.map((seg) => (
          <path key={seg.name} d={seg.d} fill={seg.color} />
        ))}
        <circle cx={CX} cy={CY} r={INNER_R} fill="white" />
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {segments.map((seg) => (
          <div key={seg.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
            {seg.name} {seg.pct.toFixed(0)}%
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="w-full mt-3">
        {segments.map((seg) => (
          <div key={seg.name} className="flex justify-between text-sm text-gray-700 py-1.5 border-b border-gray-100 last:border-none">
            <span>{seg.name} {seg.code}</span>
            <span className="font-semibold">NT$ {seg.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4：執行測試確認 PASS**

```bash
npm test components/dashboard/donut-chart.test.js
```

Expected: PASS — 6 tests green

- [ ] **Step 5：Commit**

```bash
git add components/dashboard/donut-chart.js components/dashboard/donut-chart.test.js
git commit -m "feat: add DonutChart component with SVG path calculation"
```

---

## Task 4：TradesTable component

**Files:**
- Create: `components/dashboard/trades-table.js`

純展示元件，以視覺驗證取代單元測試。

- [ ] **Step 1：建立 `components/dashboard/trades-table.js`**

```jsx
import Link from 'next/link'

export default function TradesTable({ trades, limit = 3 }) {
  const rows = trades.slice(0, limit)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900">近期交易記錄</h2>
        <Link href="/trades/new" className="text-sm text-blue-600 font-medium hover:underline">
          + 新增交易
        </Link>
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-xs text-gray-400 font-medium text-left pb-3 px-2">日期</th>
            <th className="text-xs text-gray-400 font-medium text-left pb-3 px-2">類型</th>
            <th className="text-xs text-gray-400 font-medium text-left pb-3 px-2">股票</th>
            <th className="text-xs text-gray-400 font-medium text-right pb-3 px-2">金額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((trade, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="text-sm text-gray-700 py-3 px-2">{trade.date}</td>
              <td className="py-3 px-2">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                  trade.type === '買入'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {trade.type}
                </span>
              </td>
              <td className="text-sm text-gray-700 py-3 px-2">{trade.name} {trade.code}</td>
              <td className="text-sm font-semibold text-gray-900 py-3 px-2 text-right">
                NT$ {trade.amount.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-center mt-4">
        <Link href="/trades" className="text-sm text-blue-600 font-medium hover:underline">
          查看所有交易記錄 →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2：Commit**

```bash
git add components/dashboard/trades-table.js
git commit -m "feat: add TradesTable component"
```

---

## Task 5：組合 Dashboard 頁面

**Files:**
- Modify: `app/page.js`

- [ ] **Step 1：更新 `app/page.js`**

```jsx
import StatCard from '@/components/dashboard/stat-card'
import DonutChart from '@/components/dashboard/donut-chart'
import TradesTable from '@/components/dashboard/trades-table'

const mockStats = {
  netAssets: 1282000,
  todayPnl: 15800,
  todayPct: 1.25,
}

const mockPositions = [
  { name: '台積電', code: '2330', value: 450000, color: '#4f46e5' },
  { name: '聯發科', code: '2454', value: 320000, color: '#7c3aed' },
  { name: '鴻海',   code: '2317', value: 256000, color: '#ec4899' },
  { name: '其他',   code: '',     value: 256000, color: '#f59e0b' },
]

const mockTrades = [
  { date: '2026-06-05', type: '買入', name: '台積電', code: '2330', amount: 5800 },
  { date: '2026-06-03', type: '賣出', name: '聯發科', code: '2454', amount: 5600 },
  { date: '2026-06-01', type: '買入', name: '鴻海',   code: '2317', amount: 2100 },
]

export default function DashboardPage() {
  const pnlSign = mockStats.todayPnl >= 0 ? '+' : ''

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Dashboard 總覽</h1>
      <p className="text-sm text-gray-500 mb-7">資產追蹤與最新動態</p>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <StatCard
          label="資產淨值"
          value={`NT$ ${mockStats.netAssets.toLocaleString()}`}
        />
        <StatCard
          label="今日損益"
          value={`${pnlSign}NT$ ${mockStats.todayPnl.toLocaleString()}`}
          change={mockStats.todayPct}
        />
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">持倉概況</h2>
          <DonutChart positions={mockPositions} />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <TradesTable trades={mockTrades} />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2：Commit**

```bash
git add app/page.js
git commit -m "feat: implement dashboard page with mock data"
```

---

## Task 6：執行驗證

- [ ] **Step 1：跑全套測試**

```bash
npm test
```

Expected: 所有測試通過（包含 `donut-chart.test.js` 6 tests）

- [ ] **Step 2：啟動 dev server**

```bash
npm run dev
```

開啟 `http://localhost:3000`，確認：
- 側邊欄顯示「股票記錄系統」、圖示、中文連結
- 上排：資產淨值 + 今日損益（含綠色 ↑ 1.25%）
- 下排左：Donut 圖 + legend + breakdown
- 下排右：三筆交易記錄，買入/賣出 badge 顏色正確
- 「查看所有交易記錄 →」可點，連至 `/trades`
- 「+ 新增交易」可點，連至 `/trades/new`

- [ ] **Step 3：停止 dev server（Ctrl+C）**
