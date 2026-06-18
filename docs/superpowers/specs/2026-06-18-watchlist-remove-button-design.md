# 觀察清單移除功能設計

**日期：** 2026-06-18

## 需求

觀察清單目前只能新增股票，無法移除。需要在每一行加上移除按鈕，點擊後直接刪除，不需確認對話框。

## 架構

改動三個檔案，各自職責明確：

1. **`lib/sheets.js`** — 新增 `deleteRow`，封裝 Google Sheets 的 `deleteDimension` 操作
2. **`app/api/watchlist/route.js`** — 新增 `DELETE` handler，處理 HTTP 請求
3. **`app/watchlist/page.js`** — 新增 UI 按鈕，呼叫 API

## 詳細設計

### `lib/sheets.js` — `deleteRow(sheetName, rowIndex)`

```js
export async function deleteRow(sheetName, rowIndex) {
  const sheets = getSheetsClient()
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID })
  const sheet = sheetMeta.data.sheets.find(s => s.properties.title === sheetName)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex + 1, // +1 跳過標題行
            endIndex: rowIndex + 2,
          },
        },
      }],
    },
  })
  sheetsCache.delete(sheetName)
}
```

`rowIndex` 是 `getRows()` 回傳陣列的 index（0-based，不含標題）。

### `app/api/watchlist/route.js` — `DELETE` handler

```js
export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  const rows = await getRows('觀察清單')
  const index = rows.findIndex(r => r['股票代號'] === symbol)
  if (index === -1) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await deleteRow('觀察清單', index)
  return NextResponse.json({ ok: true })
}
```

注意：`getRows` 有 cache，但 `deleteRow` 內部會 `sheetsCache.delete`，所以下次讀取會拿到最新資料。

### `app/watchlist/page.js` — UI

- 表頭最後加一欄「操作」（`text-center`）
- 每行最後一格加垃圾桶按鈕：
  ```jsx
  <button onClick={() => handleRemove(item.symbol)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" aria-label="移除">
    {/* trash icon SVG */}
  </button>
  ```
- `handleRemove` 函式：
  ```js
  async function handleRemove(symbol) {
    await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: 'DELETE' })
    loadWatchlist()
  }
  ```
- `colSpan` 從 7 改為 8（空清單提示那行）

## 錯誤處理

- symbol 不存在：API 回 404，前端靜默失敗（`loadWatchlist` 重新拉資料）
- Sheets API 失敗：API 回 500，前端靜默失敗（維持現有清單）

## 測試範圍

- `deleteRow` 的單元測試（mock Sheets client）
- `DELETE /api/watchlist` handler 測試（symbol 存在、不存在、缺少 symbol）
