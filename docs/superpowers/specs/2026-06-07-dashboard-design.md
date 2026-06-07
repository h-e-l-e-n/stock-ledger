# Dashboard 頁面設計文件

Date: 2026-06-07

## 概覽

實作 `/` 路由的 Dashboard 總覽頁面，以假資料建立版型，後續再接真實資料。

## 設計決策

| 項目 | 決策 | 理由 |
|------|------|------|
| 圓餅圖 | 純 SVG，無 library | 零依賴，數量少，掌控樣式 |
| Nav 圖示 | Inline SVG 內嵌 nav.js | 只有 7 個，與純 SVG 策略一致 |
| 資料 | Mock 假資料 | 先把版型做好，再接真實資料 |
| Component 結構 | 拆分獨立 component | 清楚、可測試，page.js 只負責組合 |

## 版面結構

```
app/page.js                         ← 組合所有 components，提供 mock data
components/dashboard/
  stat-card.js                      ← 資產淨值 / 今日損益
  donut-chart.js                    ← 持倉概況 SVG Donut 圖
  trades-table.js                   ← 近期交易記錄
components/nav.js                   ← 更新：加圖示、改中文標題
```

## 頁面布局

```
┌─────────────────────────────────────────────┐
│  Dashboard 總覽                              │
│  資產追蹤與最新動態                           │
│                                             │
│  ┌──────────────┐  ┌──────────────┐         │
│  │  資產淨值     │  │  今日損益     │         │
│  │  NT$1,282,000│  │  +NT$15,800  │         │
│  │              │  │  ↑ 1.25%     │         │
│  └──────────────┘  └──────────────┘         │
│                                             │
│  ┌──────────────┐  ┌──────────────┐         │
│  │  持倉概況     │  │  近期交易記錄 │         │
│  │  [Donut 圖]  │  │  [Table]     │         │
│  │  [Legend]    │  │  查看所有 →   │         │
│  │  [Breakdown] │  └──────────────┘         │
│  └──────────────┘                           │
└─────────────────────────────────────────────┘
```

## Component 規格

### `stat-card.js`

Props：
- `label` (string) — 卡片標題，例："資產淨值"
- `value` (string) — 主要數值，例："NT$ 1,282,000"
- `change` (number, optional) — 漲跌幅百分比，例：`1.25` 或 `-2.3`
  - 正值：綠色，顯示 ↑ 箭頭
  - 負值：紅色，顯示 ↓ 箭頭
  - 未傳入：不顯示漲跌指示器

### `donut-chart.js`

Props：
- `positions` (array) — `[{ name, code, value, color }]`

行為：
- 從 `positions` 計算各持股佔比，動態產生 SVG path
- 顯示 legend（顏色方塊 + 名稱 + 百分比）
- 顯示 breakdown 列表（股票名稱 + 市值）
- Donut 空心，中心不顯示文字

SVG path 計算：極座標轉換，`startAngle` 累加各 segment。

### `trades-table.js`

Props：
- `trades` (array) — `[{ date, type, name, code, amount }]`
- `limit` (number, default 3) — 顯示幾筆

行為：
- `type === '買入'` → 綠色 badge；`type === '賣出'` → 紅色 badge
- 底部「查看所有交易記錄 →」連結至 `/trades`
- 右上角「+ 新增交易」連結至 `/trades/new`

## Navigation 更新

`components/nav.js` 修改：
- 標題從「Stock Ledger」改為「股票記錄系統」
- 每個連結加入對應的 Inline SVG 圖示（18×18，`stroke="currentColor"`）
- 圖示對應：
  - 總覽 → home icon
  - 持倉清單 → clock icon
  - 交易記錄 → clipboard icon
  - 績效分析 → activity/trend icon
  - 股利記錄 → dollar icon
  - 觀察清單 → eye icon
  - 交易筆記 → book icon

## Mock 資料結構

```js
// app/page.js 內定義
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

const mockStats = {
  netAssets: 1282000,
  todayPnl: 15800,
  todayPct: 1.25,
}
```

## 樣式規範

延續現有 Tailwind CSS 配置（v4）：

| 元素 | 樣式 |
|------|------|
| 背景 | `bg-gray-50` |
| 卡片 | `bg-white rounded-2xl shadow-sm p-6` |
| 正損益 | `text-green-600` |
| 負損益 | `text-red-600` |
| 買入 badge | `bg-green-100 text-green-700` |
| 賣出 badge | `bg-red-100 text-red-700` |
| 連結 | `text-blue-600` |

## 範圍外

- 真實資料串接（Google Sheets / Finmind）
- 錯誤處理 / loading 狀態
- 其他頁面切版
