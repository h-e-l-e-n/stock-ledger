# Trades Parsing Library Design

**Date:** 2026-06-17
**Scope:** New `lib/trades.js` + 6 callsite updates
**Goal:** Eliminate duplicated trade row → object mapping by centralising it in `lib/trades.js`.

---

## Context

The same Google Sheets row → trade object mapping is written inline in five places (`app/page.js`, `app/positions/page.js`, `app/api/dividends/sync/route.js`, `app/fund-management/page.js`, `app/performance/page.js`). A sixth variant (`parseTrade`) lives in `app/api/trades/route.js` with a different `shares` convention and an extra `id` field. Any change to the Sheets column names requires finding and updating all six independently.

---

## Design

### `lib/trades.js` — two exported functions

```js
// For internal calculations (positions, dividends, performance, dashboard, fund-management)
// shares = 張數 × 1000 (actual share count)
// price = Number or null if blank
export function parseTradeRow(row) {
  return {
    date:       row['日期'],
    type:       row['類型'],
    fundSource: row['資金來源'],
    symbol:     row['股票代號'],
    name:       row['股票名稱'],
    shares:     Number(row['股數']) * 1000,
    price:      Number(row['價格']) || null,
    amount:     Number(row['金額']),
    fee:        Number(row['手續費']),
  }
}

// For GET /api/trades response sent to the client
// shares = 張數 (raw, not multiplied)
// price = Number (always, may be 0)
// id = 1-based row index
export function parseApiTrade(row, index) {
  return {
    id:         index + 1,
    date:       row['日期'],
    type:       row['類型'],
    fundSource: row['資金來源'],
    symbol:     row['股票代號'],
    name:       row['股票名稱'],
    shares:     Number(row['股數']),
    price:      Number(row['價格']),
    amount:     Number(row['金額']),
    fee:        Number(row['手續費']),
  }
}
```

### Callsite changes (6 files)

| File | Change |
|---|---|
| `app/page.js` | Replace inline 8-field mapping (lines 49–56) with `parseTradeRow` |
| `app/positions/page.js` | Replace inline mapping (lines 14–21) with `parseTradeRow` |
| `app/api/dividends/sync/route.js` | Replace inline mapping (lines 13–20) with `parseTradeRow` |
| `app/fund-management/page.js` | Replace inline mapping (lines 101–110) with `parseTradeRow`. Note: `computeMonthlyInvestment` (lines 42–58) operates on raw sheet rows for month grouping — do NOT replace it. |
| `app/performance/page.js` | Replace inline mapping (lines 24–32) with `parseTradeRow` (already includes `price`) |
| `app/api/trades/route.js` | Delete local `parseTrade`, import `parseApiTrade` from `@/lib/trades` |

No other files change.

### Tests — `lib/trades.test.js` (new file)

```
parseTradeRow
  ✓ maps all fields from a sheet row
  ✓ multiplies 股數 by 1000 for shares
  ✓ returns null for price when cell is empty
  ✓ returns null for price when cell is zero (|| null)

parseApiTrade
  ✓ maps all fields from a sheet row
  ✓ does NOT multiply 股數 by 1000
  ✓ sets id = index + 1
  ✓ returns 0 for price when cell is empty (Number('') → 0)
```

---

## What does NOT change

- `lib/positions.js`, `lib/performance.js`, `lib/dividends.js` — these consume the already-parsed trade objects, so no changes needed
- All tests in other files — no behaviour changes, only source of the mapping moves
- Sheets column names — this refactor makes them easier to change in future (single place)
