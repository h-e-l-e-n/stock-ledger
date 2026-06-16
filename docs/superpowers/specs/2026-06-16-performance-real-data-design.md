# 績效分析頁面：真實資料設計

**日期：** 2026-06-16

## 目標

將績效分析頁面（`/performance`）從寫死的假資料改為從 Google Sheets 交易記錄和 FinMind API 計算真實數值。

## 範圍

- 三個指標卡片：年化報酬率、已實現損益、勝率
- 成本基礎時間序列走勢圖
- 月/季/年切換按鈕（client-side filter）

不在範圍內：大盤指數對比、歷史市值走勢（需要歷史股價 API）。

---

## 資料層：`lib/performance.js`（新檔案）

### `buildCostSeries(trades)`

從交易記錄建立按月的成本基礎時間序列。

- 起點：所有交易中最早的月份
- 終點：今天（當月）
- 每個月末呼叫 `aggregateTrades(trades, { until: monthEnd })` 算出當時持倉
- 每個持倉的成本 = `costPrice * shares`，加總得到當月總投入成本
- 回傳：`[{ month: 'YYYY-MM', cost: number }, ...]`

### `computeRealizedPnl(trades)`

從賣出記錄算已實現損益。

- 對每筆賣出，查「賣出當時」的持倉成本（用 `aggregateTrades(trades, { until: saleDate })`）
- 已實現損益 = `saleAmount - saleFee - (costPrice * soldShares)`
- 加總所有賣出回傳總已實現損益

### `computeWinRate(trades)`

從賣出記錄算勝率。

- 每筆賣出：若 `price > costPrice`（當時加權平均成本）= 勝
- 回傳：`{ wins: number, total: number, rate: number | null }`
- 若無任何賣出記錄，`rate` 為 `null`，頁面顯示 `—`

### `computeAnnualizedReturn(trades, positions, prices)`

計算年化報酬率（含未實現損益）。

- 總投入成本 = 所有買入的 `amount + fee` 之和
- 已實現損益：同 `computeRealizedPnl()`
- 未實現損益 = `sum((currentPrice - costPrice) * shares)`，只計算有當前股價的持倉
- 持有天數 = 今天 - 第一筆交易日
- 年化報酬率 = `(1 + totalPnl / totalCost) ^ (365 / holdingDays) - 1`
- 若持有天數為 0 或總成本為 0，回傳 `null`

---

## 頁面架構

### `app/performance/page.js`（改為 async Server Component）

```
getRows('交易記錄')
  → parseTrades()
  → aggregateTrades() → getPrices()   // 當前持倉與股價
  → buildCostSeries()                  // 時間序列
  → computeRealizedPnl()              // 已實現損益
  → computeWinRate()                  // 勝率
  → computeAnnualizedReturn()         // 年化報酬率
  → <PerformanceClient> (props)
```

加上 `export const dynamic = 'force-dynamic'`（與持倉頁一致）。

### `components/performance/performance-client.js`（新 Client Component）

接收 props：
- `costSeries`: 完整月度時間序列
- `annualizedReturn`: number | null
- `realizedPnl`: number
- `winRate`: { wins, total, rate } | { rate: null }

**按鈕切換邏輯（client-side filter）：**

| 按鈕 | 顯示範圍 | 資料粒度 |
|------|----------|----------|
| 月度 | 最近 12 個月 | 每月一點 |
| 季度 | 最近 3 年 | 每季最後一個月 |
| 年度 | 全部歷史 | 每年最後一個月 |

三個指標卡片固定顯示，不隨切換變動。

---

## 指標卡片顯示規則

| 指標 | 正常顯示 | 無資料顯示 |
|------|----------|------------|
| 年化報酬率 | `+28.2%` / `-5.1%`（含正負號，正綠負紅） | `—` |
| 已實現損益 | `+NT$ 82,000` / `-NT$ 12,000`（含正負號） | `NT$ 0` |
| 勝率 | `65%` | `—`（無賣出記錄時） |

---

## 檔案變更清單

| 動作 | 路徑 |
|------|------|
| 新增 | `lib/performance.js` |
| 新增 | `components/performance/performance-client.js` |
| 修改 | `app/performance/page.js` |
