import { google } from 'googleapis'

export function parseSheetRows(values) {
  if (!values || values.length < 1) return []
  const [headers, ...rows] = values
  if (rows.length === 0) return []
  return rows.map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  )
}

const sheetsCache = new Map()

// exported for test teardown only
export function clearSheetsCache() {
  sheetsCache.clear()
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
  if (sheetsCache.has(sheetName)) return sheetsCache.get(sheetName)
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: sheetName,
  })
  const rows = parseSheetRows(res.data.values)
  sheetsCache.set(sheetName, rows)
  return rows
}

export async function appendRow(sheetName, values) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: sheetName,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
  sheetsCache.delete(sheetName)
}

export async function updateRow(sheetName, rowIndex, values) {
  const sheets = getSheetsClient()
  const range = `${sheetName}!A${rowIndex + 2}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
  sheetsCache.delete(sheetName)
}

export async function deleteRow(sheetName, rowIndex) {
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
  })
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName)
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex + 1,
            endIndex: rowIndex + 2,
          },
        },
      }],
    },
  })
  sheetsCache.delete(sheetName)
}
