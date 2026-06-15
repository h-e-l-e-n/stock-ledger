import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })
const spreadsheetId = process.env.GOOGLE_SHEETS_ID

const SHEET_HEADERS = {
  '持倉':     ['股票代號', '股票名稱', '股數', '成本價', '資金來源'],
  '交易記錄': ['日期', '類型', '資金來源', '股票代號', '股票名稱', '股數', '價格', '金額', '手續費'],
  '股利記錄': ['日期', '股票代號', '股票名稱', '實領金額', '殖利率'],
  '觀察清單': ['股票代號', '股票名稱', '目標價', '停損價', '開啟通知'],
  '交易筆記': ['日期', '股票代號', '股票名稱', '策略', '買入理由', '賣出理由', '預期結果', '實際結果', '事後檢討', '狀態'],
}

// 1. 取得現有工作表清單
const { data } = await sheets.spreadsheets.get({ spreadsheetId })
const existingSheets = data.sheets.map(s => s.properties)
const existingTitles = existingSheets.map(s => s.title)

console.log('現有工作表:', existingTitles.join(', '))

const requests = []

// 2. 新增不存在的工作表
const targetTitles = Object.keys(SHEET_HEADERS)
for (const title of targetTitles) {
  if (!existingTitles.includes(title)) {
    requests.push({ addSheet: { properties: { title } } })
    console.log(`+ 新增工作表: ${title}`)
  } else {
    console.log(`  已存在: ${title}`)
  }
}

// 3. 刪除預設的「工作表1」（如果存在且不在目標清單內）
const defaultSheet = existingSheets.find(s => s.title === '工作表1')
if (defaultSheet) {
  requests.push({ deleteSheet: { sheetId: defaultSheet.sheetId } })
  console.log('- 刪除預設工作表1')
}

if (requests.length > 0) {
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } })
}

// 4. 為每個工作表寫入標題列（只在 A1 是空的時候才寫）
const { data: updated } = await sheets.spreadsheets.get({ spreadsheetId })
const sheetMap = Object.fromEntries(updated.sheets.map(s => [s.properties.title, s.properties.sheetId]))

for (const [title, headers] of Object.entries(SHEET_HEADERS)) {
  const checkRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${title}!A1`,
  })
  const a1 = checkRes.data.values?.[0]?.[0]
  if (!a1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    })
    console.log(`✓ 寫入標題: ${title}`)
  } else {
    console.log(`  標題已存在，跳過: ${title}`)
  }
}

console.log('\n完成！')
