# FinMind Price Integration Design

**Date:** 2026-06-12
**Scope:** Fetch real-time (daily) stock prices from FinMind and surface them on positions, fund management, and watchlist pages.

---

## Context

- Google Sheets integration is complete; all pages read real data except `currentPrice`, which is `null` everywhere
- `FINMIND_TOKEN` is already in `.env`
- An existing proxy route `app/api/finmind/route.js` exists but is not used by pages — the new `lib/prices.js` calls FinMind directly from the server
- Taiwan Stock Exchange market hours: 09:00–13:30 (UTC+8)

---

## Architecture

### `lib/prices.js` — price fetching and caching

Single exported function:

```js
getPrices(symbols: string[]) → Promise<{ [symbol]: { price, change, changePercent } | null }>
```

**Cache strategy:**

In-memory module-level cache with two windows per Taiwan calendar day:
- **盤前 window** (`${date}-open`): 00:00–13:29 Taiwan time
- **盤後 window** (`${date}-close`): 13:30–23:59 Taiwan time

Cache key = `${taiwanDate}-${isPastClose ? 'close' : 'open'}`. When the key changes (day rollover or crossing 13:30), the cache is automatically stale and a fresh fetch is made. This means at most two FinMind fetches per day.

**FinMind fetch per symbol:**
- Dataset: `TaiwanStockPrice`
- `data_id`: the stock symbol (e.g. `2330`)
- `start_date`: 5 calendar days ago (covers weekends and holidays)
- Sort response records by `date` ascending; take last two records
- `price` = last record's `close`
- `change` = last `close` − second-to-last `close`
- `changePercent` = `change / second-to-last close × 100`
- All symbols fetched in parallel via `Promise.all`
- If a symbol fails or has fewer than 2 records: return `null` for that symbol

### `app/api/prices/route.js` — API route for client components

```
GET /api/prices?symbols=2330,0050,00878
```

Parses `symbols` query param, calls `getPrices(symbols)`, returns the price map as JSON.

---

## Page Changes

### `app/positions/page.js` (server component)

1. After `getRows('持倉')`, collect all unique stock symbols
2. Call `getPrices(symbols)`
3. Map each position: `currentPrice = prices[code]?.price ?? null`
4. Compute stat cards:
   - **持倉成本**: unchanged (`Σ costPrice × shares`, matching existing code)
   - **總損益**: `Σ (currentPrice − costPrice) × shares`, only for positions where `currentPrice != null`; if no prices available show `—`
   - **持股檔數**: unchanged
5. `PositionsTable` already handles `null` currentPrice (shows `—`)

### `app/fund-management/page.js` (server component)

1. After `getRows('持倉')`, collect symbols and call `getPrices(symbols)`
2. Per fund pool, compute:
   - `cost` = Σ costPrice × shares (matching existing code)
   - `totalAsset` = Σ currentPrice × shares for positions with non-null price, plus Σ costPrice × shares for positions without price (i.e. unknown-price positions count at cost)
   - `profit` = totalAsset − cost
   - `profitRate` = profit / cost × 100 (show `—` if cost is 0)
3. Surface `profit` and `profitRate` in the fund pool cards

### `app/watchlist/page.js` (client component)

1. After `loadWatchlist()` resolves, extract symbols from the watchlist
2. Fetch `GET /api/prices?symbols=<comma-joined>`
3. Merge into each watchlist item: `currentPrice`, `change`, `changePercent`
4. Items where price is `null` show `—` in price/change columns

---

## Data Transformation

FinMind `TaiwanStockPrice` response shape (per record):
```json
{ "stock_id": "2330", "date": "2026-06-11", "open": 980, "max": 995, "min": 978, "close": 990, "Trading_Volume": 12345678 }
```

Derivations:
- `price` = `close` of most recent record
- `change` = most recent `close` − previous `close`
- `changePercent` = `change / previous close × 100` (rounded to 2 decimal places)

---

## Error Handling

| Situation | Behaviour |
|-----------|-----------|
| FinMind returns error for a symbol | `null` for that symbol; page shows `—` |
| FinMind returns < 2 records (e.g. new listing) | `null`; page shows `—` |
| Network failure (entire getPrices call) | All symbols `null`; pages degrade gracefully |
| Empty symbols array | Return `{}` immediately, skip fetch |

---

## Out of Scope

- Historical price charts (requires different FinMind dataset)
- Intraday prices (FinMind free tier is daily data only)
- Price update notifications / alerts
- `updateRow` to write prices back to Google Sheets

---

## Files

New:
- `lib/prices.js`
- `app/api/prices/route.js`

Modified:
- `app/positions/page.js`
- `app/fund-management/page.js`
- `app/watchlist/page.js`
