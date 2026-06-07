# Stock Ledger — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the Next.js 15 project with all 8 route skeletons, Google Sheets API client, Finmind proxy route handler, and navigation layout — leaving a running app with full routing and data layer ready for feature work.

**Architecture:** Next.js App Router (JavaScript). All pages are Server Components by default. Google Sheets accessed via service account credentials in `.env.local`. Finmind API proxied through a Route Handler so the token never reaches the browser. Jest for unit-testing pure data utilities.

**Tech Stack:** Next.js 15, Tailwind CSS, googleapis, Jest

---

## File Map

```
stock-ledger/
├── .env.local                          # secrets (gitignored)
├── .env.local.example                  # committed, shows required vars
├── jest.config.js
├── lib/
│   ├── sheets.js                       # Google Sheets API client + row parser
│   └── sheets.test.js                  # unit tests for row parser
├── app/
│   ├── layout.js                       # root layout with <Nav>
│   ├── page.js                         # / Dashboard skeleton
│   ├── positions/page.js
│   ├── trades/
│   │   ├── page.js
│   │   └── new/page.js
│   ├── performance/page.js
│   ├── dividends/page.js
│   ├── watchlist/page.js
│   ├── notes/page.js
│   └── api/
│       └── finmind/route.js            # Finmind proxy
└── components/
    └── nav.js                          # sidebar navigation
```

---

## Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `next.config.js`, `tailwind.config.js` (auto-generated)
- Modify: `.gitignore` (verify `.env.local` is listed)

- [ ] **Step 1: Scaffold the project**

Run in `/Users/helen/Desktop/stock-ledger`:

```bash
npx create-next-app@latest . --js --app --tailwind --eslint --no-src-dir --no-import-alias
```

When prompted, accept all defaults (or choose "Yes" to all).

- [ ] **Step 2: Verify the dev server starts**

```bash
npm run dev
```

Expected: Server starts at `http://localhost:3000`. Open in browser — should see the default Next.js homepage.

Stop the server (`Ctrl+C`).

- [ ] **Step 3: Verify `.env.local` is gitignored**

```bash
grep ".env.local" .gitignore
```

Expected output: `.env.local`

If missing, add it:
```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js 15 project with App Router and Tailwind"
```

---

## Task 2: Set up Jest

**Files:**
- Create: `jest.config.js`
- Modify: `package.json` (add test script and devDependencies)

- [ ] **Step 1: Install Jest dependencies**

```bash
npm install --save-dev jest jest-environment-jsdom
```

- [ ] **Step 2: Create `jest.config.js`**

```javascript
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({
  testEnvironment: 'node',
})
```

- [ ] **Step 3: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 4: Verify Jest runs**

```bash
npm test -- --passWithNoTests
```

Expected: `No tests found, exiting with code 0` (or similar passing output).

- [ ] **Step 5: Commit**

```bash
git add jest.config.js package.json package-lock.json
git commit -m "chore: set up Jest"
```

---

## Task 3: Configure environment variables

**Files:**
- Create: `.env.local`
- Create: `.env.local.example`

- [ ] **Step 1: Create `.env.local.example`**

```bash
cat > .env.local.example << 'EOF'
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FINMIND_TOKEN=your_finmind_token_here
EOF
```

- [ ] **Step 2: Create `.env.local` with real values**

Copy `.env.local.example` to `.env.local` and fill in real values:

```
GOOGLE_SHEETS_ID=<your Google Sheet ID from the URL>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service account email>
GOOGLE_PRIVATE_KEY="<private key with literal \n for newlines>"
FINMIND_TOKEN=<your Finmind API token>
```

To get these values:
1. Google Cloud Console → IAM → Service Accounts → create one → download JSON key
2. Share the Google Sheet with the service account email (editor access)
3. `GOOGLE_SHEETS_ID` is the long string in the Sheet URL between `/d/` and `/edit`
4. `GOOGLE_PRIVATE_KEY` is the `private_key` field from the downloaded JSON (keep the `\n` as literal backslash-n)

- [ ] **Step 3: Install googleapis**

```bash
npm install googleapis
```

- [ ] **Step 4: Commit example file**

```bash
git add .env.local.example package.json package-lock.json
git commit -m "chore: add environment variable template and install googleapis"
```

---

## Task 4: Create Google Sheets client (TDD)

**Files:**
- Create: `lib/sheets.js`
- Create: `lib/sheets.test.js`

- [ ] **Step 1: Write the failing test**

Create `lib/sheets.test.js`:

```javascript
import { parseSheetRows } from './sheets.js'

describe('parseSheetRows', () => {
  test('returns empty array when values is empty', () => {
    expect(parseSheetRows([])).toEqual([])
    expect(parseSheetRows(null)).toEqual([])
  })

  test('returns empty array when only headers row exists', () => {
    expect(parseSheetRows([['日期', '類型', '股票代號']])).toEqual([])
  })

  test('maps rows to objects using header keys', () => {
    const values = [
      ['日期', '類型', '股票代號', '股票名稱'],
      ['2024-01-15', '買入', '2330', '台積電'],
      ['2024-02-01', '賣出', '0050', '元大台灣50'],
    ]
    expect(parseSheetRows(values)).toEqual([
      { '日期': '2024-01-15', '類型': '買入', '股票代號': '2330', '股票名稱': '台積電' },
      { '日期': '2024-02-01', '類型': '賣出', '股票代號': '0050', '股票名稱': '元大台灣50' },
    ])
  })

  test('fills missing columns with empty string', () => {
    const values = [
      ['日期', '類型', '備註'],
      ['2024-01-15', '買入'],
    ]
    expect(parseSheetRows(values)).toEqual([
      { '日期': '2024-01-15', '類型': '買入', '備註': '' },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test lib/sheets.test.js
```

Expected: FAIL — `Cannot find module './sheets.js'`

- [ ] **Step 3: Create `lib/sheets.js`**

```javascript
import { google } from 'googleapis'

export function parseSheetRows(values) {
  if (!values || values.length < 1) return []
  const [headers, ...rows] = values
  if (rows.length === 0) return []
  return rows.map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  )
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export async function getRows(sheetName) {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: sheetName,
  })
  return parseSheetRows(res.data.values)
}

export async function appendRow(sheetName, values) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}

export async function updateRow(sheetName, rowIndex, values) {
  const sheets = getSheetsClient()
  const range = `${sheetName}!A${rowIndex + 2}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}
```

Note: `rowIndex` in `updateRow` is 0-based (row 0 = first data row = Sheet row 2, since row 1 is headers).

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test lib/sheets.test.js
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/sheets.js lib/sheets.test.js
git commit -m "feat: add Google Sheets client with parseSheetRows"
```

---

## Task 5: Create Finmind Route Handler

**Files:**
- Create: `app/api/finmind/route.js`

- [ ] **Step 1: Create `app/api/finmind/route.js`**

```javascript
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const dataset = searchParams.get('dataset')
  const stockId = searchParams.get('stock_id')
  const startDate = searchParams.get('start_date') ?? new Date().toISOString().slice(0, 10)

  const params = new URLSearchParams({
    dataset,
    data_id: stockId,
    start_date: startDate,
    token: process.env.FINMIND_TOKEN,
  })

  const res = await fetch(`https://api.finmindtrade.com/api/v4/data?${params}`)
  const data = await res.json()
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Start dev server and test the route**

```bash
npm run dev
```

Open in browser or run:

```bash
curl "http://localhost:3000/api/finmind?dataset=TaiwanStockPrice&stock_id=2330&start_date=2024-01-01"
```

Expected: JSON response with Finmind stock data (status `200` with `data` array).

Stop the server.

- [ ] **Step 3: Commit**

```bash
git add app/api/finmind/route.js
git commit -m "feat: add Finmind proxy route handler"
```

---

## Task 6: Create all route skeletons

**Files:**
- Modify: `app/page.js`
- Create: `app/positions/page.js`
- Create: `app/trades/page.js`
- Create: `app/trades/new/page.js`
- Create: `app/performance/page.js`
- Create: `app/dividends/page.js`
- Create: `app/watchlist/page.js`
- Create: `app/notes/page.js`

- [ ] **Step 1: Replace `app/page.js`**

```javascript
export default function DashboardPage() {
  return <main className="p-6"><h1 className="text-2xl font-bold">Dashboard</h1></main>
}
```

- [ ] **Step 2: Create `app/positions/page.js`**

```javascript
export default function PositionsPage() {
  return <main className="p-6"><h1 className="text-2xl font-bold">持倉清單</h1></main>
}
```

- [ ] **Step 3: Create `app/trades/page.js`**

```javascript
export default function TradesPage() {
  return <main className="p-6"><h1 className="text-2xl font-bold">交易記錄</h1></main>
}
```

- [ ] **Step 4: Create `app/trades/new/page.js`**

```javascript
export default function NewTradePage() {
  return <main className="p-6"><h1 className="text-2xl font-bold">新增交易</h1></main>
}
```

- [ ] **Step 5: Create `app/performance/page.js`**

```javascript
export default function PerformancePage() {
  return <main className="p-6"><h1 className="text-2xl font-bold">績效分析</h1></main>
}
```

- [ ] **Step 6: Create `app/dividends/page.js`**

```javascript
export default function DividendsPage() {
  return <main className="p-6"><h1 className="text-2xl font-bold">股利記錄</h1></main>
}
```

- [ ] **Step 7: Create `app/watchlist/page.js`**

```javascript
export default function WatchlistPage() {
  return <main className="p-6"><h1 className="text-2xl font-bold">觀察清單</h1></main>
}
```

- [ ] **Step 8: Create `app/notes/page.js`**

```javascript
export default function NotesPage() {
  return <main className="p-6"><h1 className="text-2xl font-bold">交易筆記</h1></main>
}
```

- [ ] **Step 9: Commit**

```bash
git add app/
git commit -m "feat: add skeleton pages for all 8 routes"
```

---

## Task 7: Create navigation layout

**Files:**
- Create: `components/nav.js`
- Modify: `app/layout.js`

- [ ] **Step 1: Create `components/nav.js`**

```javascript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',             label: 'Dashboard' },
  { href: '/positions',    label: '持倉清單' },
  { href: '/trades',       label: '交易記錄' },
  { href: '/performance',  label: '績效分析' },
  { href: '/dividends',    label: '股利記錄' },
  { href: '/watchlist',    label: '觀察清單' },
  { href: '/notes',        label: '交易筆記' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <nav className="w-48 min-h-screen bg-gray-900 text-white flex flex-col p-4 gap-1 shrink-0">
      <span className="text-lg font-bold mb-6 px-2">Stock Ledger</span>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-3 py-2 rounded text-sm transition-colors ${
            pathname === href
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Update `app/layout.js`**

Replace the contents with:

```javascript
import './globals.css'
import Nav from '@/components/nav'

export const metadata = {
  title: 'Stock Ledger',
  description: '個人股票帳本',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className="flex bg-gray-50 min-h-screen">
        <Nav />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Start dev server and verify all routes**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Sidebar shows all 7 nav links
- Active link is highlighted
- Clicking each link navigates to the correct page
- All pages show their title heading

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add components/nav.js app/layout.js
git commit -m "feat: add sidebar navigation layout"
```

---

## Task 8: Verify test suite and run all tests

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass. (Currently only `lib/sheets.test.js` — 4 tests.)

- [ ] **Step 2: Confirm no TypeScript or build errors**

```bash
npm run build
```

Expected: Build completes successfully with no errors.

- [ ] **Step 3: Commit if any fixes were needed**

If any fixes were made to get tests or build passing:

```bash
git add -A
git commit -m "fix: resolve build or test issues"
```
