# Dividend Sync Design

**Date:** 2026-06-15
**Scope:** Auto-fetch dividend records from FinMind and write computed received amounts to the `股利記錄` Google Sheet, triggered by a manual "同步股利" button on the dividend page.

---

## Goal

Replace manual entry in `股利記錄` with an automated sync that:
1. Fetches dividend policy data (現金股利 + 股票股利) from FinMind for all stocks ever traded
2. Computes actual received amount based on shares held at each ex-dividend date
3. Writes new records to `股利記錄`, skipping any already present

---

## Architecture

### New files

| File | Purpose |
|------|---------|
| `lib/dividends.js` | Pure functions: `fetchDividends`, `computeReceivedDividends` |
| `app/api/dividends/sync/route.js` | POST endpoint orchestrating the sync |
| `components/sync-dividends-button.js` | Client button component |

### Modified files

| File | Change |
|------|--------|
| `lib/positions.js` | Add optional `until` date param to `aggregateTrades` |
| `app/dividends/page.js` | Add `SyncDividendsButton` to page header |

---

## `aggregateTrades` — date cutoff

```js
aggregateTrades(trades, { until } = {})
```

When `until` (YYYY-MM-DD string) is provided, only trades where `trade.date <= until` are processed. Returns the portfolio snapshot at that date.

Existing callers pass no second argument and are unaffected.

---

## `lib/dividends.js`

### `fetchDividends(symbols)`

Calls FinMind `TaiwanStockDividend` dataset for each symbol:

```
GET https://api.finmindtrade.com/api/v4/data
  ?dataset=TaiwanStockDividend
  &data_id=<symbol>
  &token=<FINMIND_TOKEN>
```

Returns an array of dividend records. Relevant fields (verify exact names against API response at implementation time):

| Field | Meaning |
|-------|---------|
| `stock_id` | Stock code |
| `year` | Fiscal year |
| `CashEarningsDistribution` | Cash dividend per share (NT$) |
| `StockEarningsDistribution` | Stock dividend per share at par value (NT$) |
| `ExDividendTradingDate` | Ex-dividend date (YYYY-MM-DD) |

Records where both `CashEarningsDistribution` and `StockEarningsDistribution` are 0 are skipped.

### `computeReceivedDividends(dividendRecords, trades)`

For each dividend record:

1. Call `aggregateTrades(trades, { until: ExDividendTradingDate })` to get shares held at ex-date
2. Find the matching position by `stock_id`
3. Calculate:
   ```
   totalPerShare = CashEarningsDistribution + StockEarningsDistribution
   amount        = shares × totalPerShare
   yieldRate     = totalPerShare / costPrice × 100
   ```
4. Skip if `shares === 0` (not held at ex-date)

Returns array of `{ date, symbol, name, amount, yieldRate }`.

---

## `POST /api/dividends/sync`

```
1. getRows('交易記錄') → rows
   trades = rows.map(row => ({ ...row, shares: Number(row['股數']) * 1000, ... }))
2. symbols = [...new Set(trades.map(t => t.symbol))]
3. dividendRecords = await fetchDividends(symbols)
4. computed = computeReceivedDividends(dividendRecords, trades)
5. existing = await getRows('股利記錄')
6. existingKeys = new Set(existing.map(r => `${r['股票代號']}|${r['日期']}`))
7. newRecords = computed.filter(r => !existingKeys.has(`${r.symbol}|${r.date}`))
8. appendRow each newRecord to '股利記錄'
9. return { added: newRecords.length }
```

---

## `components/sync-dividends-button.js`

Client component:

- Renders 「同步股利」button with refresh icon
- On click: sets loading state → POST `/api/dividends/sync` → shows result toast (「已新增 N 筆股利紀錄」or「已是最新」) → `router.refresh()`
- Disabled while loading

---

## `股利記錄` row format

Columns (existing): `日期`, `股票代號`, `股票名稱`, `實領金額`, `殖利率`

Written values:
- 日期 = `ExDividendTradingDate`
- 實領金額 = `Math.round(amount)`
- 殖利率 = `+yieldRate.toFixed(2)`

---

## Error handling

- If FinMind returns no data for a symbol: skip silently
- If `FINMIND_TOKEN` is missing: return 500 with clear message
- If Sheets write fails: return 500, no partial writes are retried

---

## Testing

Pure functions in `lib/dividends.js` are unit-tested:
- `computeReceivedDividends` with known trades and dividend records
- Edge cases: not held at ex-date, zero dividend, both cash and stock dividend

`aggregateTrades` date cutoff tested in `lib/positions.test.js`.

Run with: `npx jest`
