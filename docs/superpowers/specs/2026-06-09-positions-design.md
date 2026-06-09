# 持倉清單頁面設計文件

Date: 2026-06-09

## 概覽

實作 `/positions` 路由的持倉清單頁面，以假資料建立版型，支援用戶端互動排序，後續再接真實資料。

## 設計決策

| 項目 | 決策 | 理由 |
|------|------|------|
| 排序方式 | 用戶端互動排序 | 即時回應，不需重新抓資料 |
| Component 架構 | Server Component page + 'use client' PositionsTable | Page 專注資料提供，排序邏輯封裝在 table |
| StatCard | 複用 `components/dashboard/stat-card.js` | 已有現成 component，樣式一致 |
| 資料 | Mock 假資料 | 延續 Dashboard 模式，先版型後資料 |
| 依賴 | 零新 npm 依賴 | 延續零依賴策略 |

## 版面結構

```
app/positions/page.js                ← Server Component，提供 mock data
components/positions/
  positions-table.js                 ← 'use client'，排序互動邏輯
```

複用：`components/dashboard/stat-card.js`

## 頁面布局

```
┌─────────────────────────────────────────────────────────┐
│  持倉清單                                                 │
│  目前持有的股票投資組合                                    │
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │  持倉總市值   │ │  總損益      │ │  持股檔數     │     │
│  │  NT$151,350  │ │ +NT$9,510   │ │  5           │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 股票代號↕ 股票名稱↕ 持有股數↕ 成本價↕ 現價↕ 損益金額↕ 損益%↕ │
│  │ 2317      鴻海      200     108    105    -600  -2.78% │
│  │ 2330      台積電    100     520    580  +6,000 +11.54% │
│  │ ...                                                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Mock 資料

定義在 `app/positions/page.js`：

```js
const mockPositions = [
  { code: '2317', name: '鴻海',  shares: 200, costPrice: 108,  currentPrice: 105  },
  { code: '2330', name: '台積電', shares: 100, costPrice: 520,  currentPrice: 580  },
  { code: '2412', name: '中華電', shares: 80,  costPrice: 118,  currentPrice: 120  },
  { code: '2454', name: '聯發科', shares: 50,  costPrice: 1050, currentPrice: 1120 },
  { code: '2882', name: '國泰金', shares: 150, costPrice: 42,   currentPrice: 45   },
]
```

計算欄位（在 `PositionsTable` 內計算，不存在 mock 資料中）：

- `pnlAmount = (currentPrice - costPrice) * shares`
- `pnlPct = (currentPrice - costPrice) / costPrice * 100`

## Component 規格

### `app/positions/page.js`

Server Component，不含互動邏輯：

1. 定義 `mockPositions` 陣列
2. 從陣列計算頁面摘要：
   - `totalValue = sum(currentPrice * shares)`
   - `totalPnl = sum((currentPrice - costPrice) * shares)`
   - `stockCount = mockPositions.length`
3. 渲染頁面標題、3 個 StatCard、`<PositionsTable positions={mockPositions} />`

StatCard 數值格式：
- 持倉總市值：`NT$ {totalValue.toLocaleString()}`（無 change prop）
- 總損益：`NT$ {sign}{Math.abs(totalPnl).toLocaleString()}`，change = `totalPnl / (totalValue - totalPnl) * 100`
- 持股檔數：`{stockCount}`（無 change prop）

### `components/positions/positions-table.js`

`'use client'`，props：`{ positions }`

**計算欄位**（useMemo 或直接 map，每次 render 重新計算）：

```js
const rows = positions.map(p => ({
  ...p,
  pnlAmount: (p.currentPrice - p.costPrice) * p.shares,
  pnlPct: (p.currentPrice - p.costPrice) / p.costPrice * 100,
}))
```

**排序狀態**：

```js
const [sortKey, setSortKey] = useState(null)   // null = 未排序
const [sortDir, setSortDir] = useState('asc')  // 'asc' | 'desc'
```

**排序邏輯**：

- 點擊未排序欄位 → `sortKey = 欄位`, `sortDir = 'asc'`
- 點擊已排序同欄位 → `sortDir` 切換 asc↔desc
- 切換到其他欄位 → `sortKey = 新欄位`, `sortDir = 'asc'`
- `sortKey === null` 時保持原始順序

**排序指示器**：

- 未排序欄：`↕`（`text-gray-400`）
- 排序中欄 asc：`↑`（`text-gray-700`）
- 排序中欄 desc：`↓`（`text-gray-700`）

**可排序的欄位**：全部 7 欄（`code`, `name`, `shares`, `costPrice`, `currentPrice`, `pnlAmount`, `pnlPct`）

**損益著色**：

- `pnlAmount > 0`、`pnlPct > 0` → `text-green-600`
- `pnlAmount < 0`、`pnlPct < 0` → `text-red-600`
- 零值 → `text-gray-900`

**數值格式**：

- 持有股數：整數，`toLocaleString()`
- 成本價 / 現價：整數，`toLocaleString()`，加 `NT$ ` 前綴
- 損益金額：`NT$ {sign}{Math.abs(pnlAmount).toLocaleString()}`
- 損益%：`{sign}{Math.abs(pnlPct).toFixed(2)}%`

**Key**：`pos.code`（每檔唯一）

## 樣式規範

延續 Dashboard 樣式：

| 元素 | 樣式 |
|------|------|
| 背景 | `bg-gray-50` |
| 卡片 | `bg-white rounded-2xl shadow-sm p-6` |
| 正損益 | `text-green-600` |
| 負損益 | `text-red-600` |
| 表頭 | `text-xs text-gray-400 font-medium` |
| 排序按鈕 | `cursor-pointer select-none hover:text-gray-700` |
| 表格列分隔 | `border-t border-gray-100` |

## 範圍外

- 真實資料串接（Google Sheets / Finmind）
- Loading / 錯誤狀態
- 買入 / 賣出操作
- 其他頁面切版
