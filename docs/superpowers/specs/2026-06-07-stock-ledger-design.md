# Stock Ledger — Design Spec

Date: 2026-06-07

## Overview

A personal stock ledger web app for tracking trades, positions, dividends, watchlist, and trading notes. Built with Next.js App Router, using Google Sheets as the data store and Finmind for Taiwan stock market data.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15, App Router, JavaScript |
| Data store | Google Sheets (via Google Sheets API v4) |
| Stock data | Finmind API |
| Notifications | Gmail API |
| Scheduler | GitHub Actions (every 30 min during trading hours) |
| Deployment | Local only |

## Pages

| Route | Page | Data Source |
|-------|------|-------------|
| `/` | Dashboard — 總資產、今日損益、持倉摘要 | trades (computed) + Finmind |
| `/positions` | 持倉清單 — 持股成本、現價、損益 | trades (computed) + Finmind |
| `/trades` | 交易記錄 — 列表、篩選 | Sheets: trades |
| `/trades/new` | 新增交易 — 表單 | → Sheets: trades |
| `/performance` | 績效分析 — 報酬率、損益圖表 | trades (computed) |
| `/dividends` | 股利記錄 — 列表、新增 | Sheets: dividends |
| `/watchlist` | 觀察清單 — 列表、現價、漲跌 | Sheets: watchlist + Finmind |
| `/notes` | 交易筆記 — 列表、新增、編輯 | Sheets: notes |

## Google Sheets Structure

### `trades`
| 欄位 | 說明 |
|------|------|
| 日期 | YYYY-MM-DD |
| 類型 | 買入 / 賣出 |
| 股票代號 | 例：2330 |
| 股票名稱 | 例：台積電 |
| 股數 | 正整數 |
| 價格 | 每股成交價 |
| 金額 | 股數 × 價格 |
| 手續費 | |

### `dividends`
| 欄位 | 說明 |
|------|------|
| 日期 | 發放日 |
| 代號 | 股票代號 |
| 現金股利 | 元/股 |
| 股票股利 | 股/千股 |
| 殖利率 | % |

### `watchlist`
| 欄位 | 說明 |
|------|------|
| 股票代號 | |
| 股票名稱 | |
| 目標價 | 到價時通知 |
| 停損價 | 跌破時通知 |
| 提示 | 自訂備註 |
| 通知 | TRUE / FALSE，是否啟用 Gmail 通知 |

> 現價、漲跌從 Finmind 即時抓取，不存入 Sheets。

### `notes`
| 欄位 | 說明 |
|------|------|
| 日期 | 記錄日期 |
| 股票代號 | 關聯股票 |
| 類型 | 短線 / 長期持有 |
| 方向 | 買入 / 賣出 |
| 買賣理由 | |
| 預期結果 | |
| 實際結果 | |
| 事後檢討 | |
| 狀態 | 持有中 / 已結束 |

## Computed Data (not stored in Sheets)

- **positions**：從 `trades` 依股票代號加總計算持有股數、平均成本，再搭配 Finmind 現價顯示未實現損益
- **performance**：從 `trades` 計算已實現損益、報酬率；圖表資料在前端計算

## Data Flow

### Read
```
Server Component
  → Google Sheets API (server-side, credentials in .env.local)
  → render HTML
```

### Write
```
Client form
  → Server Action
  → Google Sheets API (append/update row)
  → revalidatePath()
```

### Stock Prices
```
Server Component
  → /api/finmind Route Handler
  → Finmind API (token in .env.local)
  → return price data
```

### Notifications (independent of Next.js app)
```
GitHub Actions (cron: every 30 min, Mon–Fri 09:00–13:30 Taiwan time)
  → read watchlist from Google Sheets
  → fetch current prices from Finmind
  → compare against 目標價 / 停損價 where 通知 = TRUE
  → if triggered: send Gmail via Gmail API
```

## Architecture Decisions

- **Server Components by default** — only use `"use client"` for interactive forms and charts
- **No ORM / query layer** — Sheets API calls are thin wrappers, data volume is small
- **Positions and performance are always computed** — no derived data stored, always consistent with trades
- **GitHub Actions script is standalone** — plain Node.js script, no dependency on the Next.js app being running
