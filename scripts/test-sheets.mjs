import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })

try {
  const res = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
  })
  console.log('✓ 連線成功！')
  console.log('試算表名稱:', res.data.properties.title)
  console.log('工作表 (sheets):')
  res.data.sheets.forEach(s => console.log(' -', s.properties.title))
} catch (err) {
  console.error('✗ 連線失敗:', err.message)
}
