# Dashboard Real Data Integration Design

**Date:** 2026-06-12
**Scope:** Replace all hardcoded mock data in `app/page.js` with real data from Google Sheets and FinMind prices.

---

## Context

- All other pages already read from Google Sheets and FinMind. The dashboard is the only remaining page with mock data.
- `lib/sheets.js` exports `getRows(sheetName)`. `lib/prices.js` exports `getPrices(symbols)`.
- `StatCard`, `DonutChart`, and `TradesTable` components are unchanged — only the data passed to them changes.
- `DonutChart` expects `positions: { name, code, value, color }[]`
- `TradesTable` expects `trades: { date, type, name, code, amount }[]`

---

## Architecture

`app/page.js` becomes an async server component with `export const dynamic = 'force-dynamic'`. No new files, no new API routes. Pattern matches `app/positions/page.js`, `app/dividends/page.js`, and `app/fund-management/page.js`.

Data is fetched at render time:
1. `Promise.all([getRows('持倉'), getRows('交易記錄')])` — parallel sheet reads
2. `getPrices(symbols)` — using existing FinMind cache

All fetches are wrapped in a single try-catch; on failure, components receive empty arrays and `—` values.

---

## Data Transformations

### Positions (from 持倉 sheet)

```js
const rawPositions = posRows.map(row => ({
  code: row['股票代號'],
  name: row['股票名稱'],
  shares: Number(row['股數']),
  costPrice: Number(row['成本價']),
  fundSource: row['資金來源'],
}))
```

After `getPrices`:

```js
positions = rawPositions.map(p => ({
  ...p,
  currentPrice: prices[p.code]?.price ?? null,
  change: prices[p.code]?.change ?? null,
}))
```

### Computed stat values

| Stat | Formula |
|------|---------|
| 資產淨值 | Σ(currentPrice × shares) for priced; Σ(costPrice × shares) for unpriced |
| 今日損益 | Σ(change × shares) for priced positions; `null` if none are priced |
| 今日損益% | todayPnl ÷ Σ((currentPrice − change) × shares) × 100; `null` if no priced positions or prev value is 0 |

### DonutChart positions

Color assignment by `資金來源`:

```js
const FUND_COLORS = {
  '定期定額': '#3b82f6',
  '貸款資金': '#8b5cf6',
  '閒錢操作': '#10b981',
}
```

Each position:

```js
{
  name: p.name,
  code: p.code,
  value: p.currentPrice != null ? p.currentPrice * p.shares : p.costPrice * p.shares,
  color: FUND_COLORS[p.fundSource] ?? '#94a3b8', // gray fallback
}
```

Positions with zero value are excluded from the donut.

### Recent trades (from 交易記錄 sheet)

Last 5 rows, reversed (newest first):

```js
recentTrades = tradeRows.slice(-5).reverse().map(row => ({
  date: row['日期'],
  type: row['類型'],
  name: row['股票名稱'],
  code: row['股票代號'],
  amount: Number(row['金額']),
}))
```

---

## Error Handling

| Situation | Behaviour |
|-----------|-----------|
| Sheet read fails | `positions = []`, `recentTrades = []`; stats show `—`, charts show empty state |
| `getPrices` fails per symbol | That symbol's `currentPrice`/`change` = null; falls back to cost |
| No positions | 資產淨值 = NT$ 0, 今日損益 = `—`, donut empty |
| No trades | TradesTable renders empty state (handled by component) |

---

## StatCard rendering

- **資產淨值**: always shows a number (even if all fall back to cost basis)
- **今日損益**: value = `NT$ ${Math.round(todayPnl).toLocaleString()}` if non-null, else `—`; `change` prop = `todayPct` (percentage for the indicator arrow), `null` or `undefined` when not available (StatCard already handles missing `change`)

---

## Out of Scope

- Intraday refresh / real-time updates
- Historical performance chart on dashboard
- Per-fund-source breakdown on dashboard (covered by 資金管理 page)

---

## Files

Modified:
- `app/page.js` — convert to async server component, replace mock data
