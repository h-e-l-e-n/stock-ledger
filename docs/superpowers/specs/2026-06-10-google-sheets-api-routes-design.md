# Google Sheets API Routes & Page Integration

**Date:** 2026-06-10
**Scope:** Wire all pages to real Google Sheets data, replacing hardcoded mock data.

---

## Context

- `lib/sheets.js` already provides `getRows(sheetName)`, `appendRow(sheetName, values)`, `updateRow(sheetName, rowIndex, values)`
- 5 Google Sheets tabs exist: 持倉、交易記錄、股利記錄、觀察清單、交易筆記
- Pattern: server components call `lib/sheets.js` directly; client components go through API routes

---

## Architecture

### API Routes (client components only)

**`app/api/trades/route.js`**
- `GET` — reads `交易記錄` sheet, returns array of trade objects
- `POST` — appends one row to `交易記錄` sheet, returns `{ ok: true }`

**`app/api/watchlist/route.js`**
- `GET` — reads `觀察清單` sheet, returns array of watchlist items
- `POST` — appends one row to `觀察清單` sheet, returns `{ ok: true }`

**`app/api/notes/route.js`**
- `GET` — reads `交易筆記` sheet, returns array of note objects
- `POST` — appends one row to `交易筆記` sheet, returns `{ ok: true }`

### Server Component Updates (direct lib calls)

**`app/positions/page.js`**
- Add `async`, call `getRows('持倉')`
- Map sheet row → `{ code, name, shares, costPrice, fundSource }`
- `currentPrice` left as `null` until FinMind integration; when `null`, show `—` in price column and skip P&L stat cards

**`app/dividends/page.js`**
- Add `async`, call `getRows('股利記錄')`
- Aggregate `yearlyDividends` by year (sum of 實領金額)
- Aggregate `stockDividends` by stock symbol (sum + average yield)

**`app/fund-management/page.js`**
- Add `async`, call `getRows('持倉')`
- Group rows by `資金來源`, compute `cost = sum(shares × costPrice)` per pool
- `totalAsset` and `profitRate` left as cost only until FinMind integration
- Performance chart data stays hardcoded (requires historical data, out of scope)

### Client Component Updates

**`app/trades/page.js`**
- Replace `mockTrades` with `useState([])` + `useEffect` fetching `GET /api/trades`
- Add `loading` state, show spinner while fetching

**`app/trades/new/page.js`**
- On form submit, `POST /api/trades` with row values in sheet column order
- On success, redirect to `/trades`

**`app/watchlist/page.js`**
- Replace `mockWatchlist` with `useState([])` + `useEffect` fetching `GET /api/watchlist`
- Add form submit handler: `POST /api/watchlist`, on success call the same fetch function to reload the full list, close the add form
- `currentPrice`, `change`, `changePercent` default to `0` until FinMind integration

**`app/notes/page.js`**
- Replace `mockNotes` with `useState([])` + `useEffect` fetching `GET /api/notes`
- Add form submit handler: `POST /api/notes`, on success reload the full list, close the add form

---

## Data Transformations

All sheet values are strings. Each route/page parses to correct types:

| Sheet | String → Type conversions |
|-------|--------------------------|
| 持倉 | 股數 → `Number`, 成本價 → `Number` |
| 交易記錄 | 股數, 價格, 金額, 手續費 → `Number` |
| 股利記錄 | 實領金額, 殖利率 → `Number` |
| 觀察清單 | 目標價, 停損價 → `Number`; 開啟通知 → `=== 'TRUE'` |
| 交易筆記 | no numeric conversions needed |

Sheet column order must match `SHEET_HEADERS` from `scripts/setup-sheets.mjs`.

---

## Out of Scope

- `currentPrice` / live stock data (requires FinMind integration)
- `updateRow` / delete operations (no edit/delete UI exists yet)
- `資金管理` performance chart with real historical data
- Error boundary / retry UI for failed fetches

---

## File Checklist

New files:
- `app/api/trades/route.js`
- `app/api/watchlist/route.js`
- `app/api/notes/route.js`

Modified files:
- `app/positions/page.js`
- `app/dividends/page.js`
- `app/fund-management/page.js`
- `app/trades/page.js`
- `app/trades/new/page.js`
- `app/watchlist/page.js`
- `app/notes/page.js`
