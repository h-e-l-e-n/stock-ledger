# Google Sheets In-Memory Cache

**Date:** 2026-06-16  
**Scope:** `lib/sheets.js` + all write API routes  
**Goal:** Eliminate redundant Sheets API calls by caching reads in module-level memory, with precise invalidation on writes.

---

## Context

Every page load currently hits the Google Sheets API cold. There is no caching. This adds 500ms–2s of latency on every navigation. The app is single-user and all data mutations go through the app's own API routes, so we know exactly when data changes.

---

## Design

### Cache structure (`lib/sheets.js`)

Add a module-level `Map` keyed by sheet name. `getRows` checks the cache before calling the Sheets API. `appendRow` and `updateRow` delete the relevant cache entry immediately after a successful write.

```js
const sheetsCache = new Map()  // Map<sheetName: string, rows: object[]>

getRows(sheetName):
  if sheetsCache.has(sheetName) → return sheetsCache.get(sheetName)
  rows = await Sheets API call
  sheetsCache.set(sheetName, rows)
  return rows

appendRow(sheetName, values):
  await Sheets API write
  sheetsCache.delete(sheetName)

updateRow(sheetName, rowIndex, values):
  await Sheets API write
  sheetsCache.delete(sheetName)
```

No TTL. Cache lives for the lifetime of the Node.js server process. On restart, the first read per sheet repopulates the cache.

### Sheet → write route mapping

| Sheet | Invalidated by |
|---|---|
| `交易記錄` | `POST /api/trades` |
| `交易筆記` | `POST /api/notes` |
| `觀察清單` | `POST /api/watchlist` |
| `股利記錄` | `POST /api/dividends/sync` |

Invalidation happens automatically because `appendRow` and `updateRow` already receive `sheetName` — no changes needed to API routes.

### Files changed

- `lib/sheets.js` — add `sheetsCache` Map, update `getRows`/`appendRow`/`updateRow`

No page files, no API route files, no new dependencies.

---

## What stays the same

- `lib/prices.js` already has its own cache (unchanged)
- All API routes stay the same — cache invalidation is fully internal to `lib/sheets.js`
- All pages stay the same

---

## Testing

- `lib/sheets.test.js` already exists; extend it to assert cache hit/miss and that writes clear the cache
- Manual verification: open two pages that read `交易記錄` back-to-back, confirm the second is noticeably faster
