# Positions Computed from Trades Design

**Date:** 2026-06-12
**Scope:** Replace static `持倉` sheet reads with dynamic aggregation from `交易記錄`, so the positions list always reflects actual trades without manual sheet maintenance.

---

## Context

- `app/positions/page.js`, `app/fund-management/page.js`, and `app/page.js` all currently read from the `持倉` Google Sheet
- Trades are recorded in `交易記錄` with fields: `日期`, `類型`, `資金來源`, `股票代號`, `股票名稱`, `股數`, `價格`, `金額`, `手續費`
- `parseTrade(row, index)` is already exported from `app/api/trades/route.js` and parses a sheet row into `{ id, date, type, fundSource, symbol, name, shares, price, amount, fee }`
- After this change, the `持倉` sheet is no longer read by any page

---

## Architecture

New pure function `aggregateTrades(trades)` in `lib/positions.js` computes current positions from trade history. All three server pages that previously read from `持倉` are updated to read `交易記錄` and call `aggregateTrades` instead.

```
交易記錄 sheet
    ↓ getRows('交易記錄')
    ↓ rows.map(parseTrade)
    ↓ aggregateTrades(trades)
positions: { code, name, fundSource, shares, costPrice }[]
    ↓ getPrices(symbols)
app/positions/page.js, app/fund-management/page.js, app/page.js
```

---

## `lib/positions.js`

Single exported function:

```js
aggregateTrades(trades) → { code, name, fundSource, shares, costPrice }[]
```

**Algorithm:**

1. Sort trades by `date` ascending (ensures chronological order regardless of sheet order)
2. Group by `(symbol, fundSource)` key
3. For each group, process trades in order:
   - **買入:** `totalCost += amount + fee`; `shares += trade.shares`; `costPrice = totalCost / shares`
   - **賣出:** `shares -= trade.shares`; `totalCost *= shares / prevShares` (proportional reduction keeps costPrice unchanged)
4. Filter out groups where `shares <= 0` (fully sold positions)
5. Return array of `{ code, name, fundSource, shares, costPrice }`

**Notes:**
- `amount` already equals `price × shares` per trade; adding `fee` rolls the transaction cost into the cost basis
- After a sell, `costPrice` is unchanged — only `shares` and `totalCost` decrease proportionally
- `name` is taken from the most recent trade for that (symbol, fundSource) group

---

## Page Changes

### `app/positions/page.js`

Replace `getRows('持倉')` with:

```js
const rows = await getRows('交易記錄')
const trades = rows.map((row, i) => parseTrade(row, i))
const rawPositions = aggregateTrades(trades)
```

`rawPositions` shape matches what the page already expects (`code`, `name`, `shares`, `costPrice`). `fundSource` is now also present per row but unused by this page — no other changes needed.

### `app/fund-management/page.js`

Same replacement. `groupByFundSource` already receives positions and groups by `fundSource`, so it works correctly once positions include `fundSource` per row (which they now always do).

Previously, the `持倉` sheet had an explicit `資金來源` column. The aggregated positions have `fundSource` derived directly from the trade records — the grouping is now exact.

### `app/page.js` (Dashboard)

Same replacement. `computeDashboardStats` and `toDonutPositions` both operate on the position array and are unaffected — they already handle `fundSource` and `costPrice`.

---

## Error Handling

| Situation | Behaviour |
|-----------|-----------|
| `getRows('交易記錄')` fails | try/catch in each page; positions = [], page shows empty state |
| Trade with unknown `type` (not 買入/賣出) | Skipped silently |
| Sell more shares than held (data error) | `shares` goes negative; filtered out by `shares <= 0` check |
| No trades at all | Returns `[]`; pages show empty state |

---

## Testing

`lib/positions.test.js` covers `aggregateTrades`:

- Single buy → correct shares and costPrice
- Two buys (same symbol + fundSource) → weighted average cost
- Buy then sell → remaining shares, costPrice unchanged
- Fully sold → excluded from output
- Same symbol, different fundSource → two separate rows
- Fee included in cost basis
- Trades processed in date order regardless of input order

---

## Files

New:
- `lib/positions.js`
- `lib/positions.test.js`

Modified:
- `app/positions/page.js`
- `app/fund-management/page.js`
- `app/page.js`
