# Stock Ledger 股票帳本

個人台股投資記錄與分析工具。以 Google Sheets 為資料庫，自動從交易記錄計算持倉，串接 FinMind API 取得即時股價。

![Dashboard](docs/screenshots/dashboard.png)

## 功能特色

- **Dashboard 總覽** — 資產淨值、今日損益、持倉比例圓餅圖、最新交易紀錄
- **持倉清單** — 從交易歷史動態計算持倉（加權平均成本），無需手動維護持倉表
- **資金管理** — 依資金來源（定期定額 / 貸款資金 / 閒錢操作）追蹤各池損益與報酬率
- **交易記錄** — 完整的買賣紀錄，支援新增交易
- **觀察清單** — 追蹤感興趣的股票與目標價
- **股利記錄** — 記錄歷年領息明細
- **績效分析** — 投資組合績效追蹤
- **交易筆記** — 每筆交易的策略與事後檢討

## 技術架構

- **Frontend / Backend** — [Next.js](https://nextjs.org) App Router（Server Components）
- **資料庫** — Google Sheets（透過 Google Sheets API 讀寫）
- **股價來源** — [FinMind](https://finmindtrade.com) API（台股歷史收盤價，每日最多兩次快取）
- **樣式** — Tailwind CSS

## 快速開始

### 1. 環境需求

- Node.js 20.6+
- Google Cloud 服務帳號（需有 Google Sheets API 存取權限）
- FinMind API Token（[免費申請](https://finmindtrade.com)）

### 2. 複製專案

```bash
git clone <repo-url>
cd stock-ledger
npm install
```

### 3. 建立 Google Sheets

在 Google Sheets 建立一份試算表，並與服務帳號共用（Editor 權限）。接著執行初始化腳本，自動建立所需的工作表與標題列：

```bash
node --env-file=.env scripts/setup-sheets.mjs
```

需要的工作表：`持倉`、`交易記錄`、`股利記錄`、`觀察清單`、`交易筆記`

### 4. 設定環境變數

建立 `.env` 檔案：

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_ID=your-spreadsheet-id
FINMIND_TOKEN=your-finmind-token
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 交易記錄格式

新增交易時，**股數以「張」為單位**（1 張 = 1000 股），價格為每股元。

| 欄位 | 說明 |
|------|------|
| 日期 | YYYY-MM-DD |
| 類型 | 買入 / 賣出 |
| 資金來源 | 定期定額 / 貸款資金 / 閒錢操作 |
| 股票代號 | 如 2330、0050 |
| 股數 (張) | 支援小數，如 0.5 |
| 價格 (元) | 每股價格 |
| 手續費 (元) | 可填 0 |

## 股價更新頻率

FinMind API 每個交易日分兩個視窗快取：

- **盤中**（09:00–13:29 台灣時間）：重新整理頁面不會重打 API
- **盤後**（13:30–23:59）：收盤後更新一次，隔日再更新
