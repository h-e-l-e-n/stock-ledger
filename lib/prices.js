let cache = { key: '', data: new Map() }

export function getCacheKey(now = new Date()) {
  const TAIWAN_OFFSET_MS = 8 * 60 * 60 * 1000
  const taiwanTime = new Date(now.getTime() + TAIWAN_OFFSET_MS)
  const date = taiwanTime.toISOString().slice(0, 10)
  const hours = taiwanTime.getUTCHours()
  const minutes = taiwanTime.getUTCMinutes()
  const isPastClose = hours > 13 || (hours === 13 && minutes >= 30)
  return `${date}-${isPastClose ? 'close' : 'open'}`
}

export function parsePriceRecords(records) {
  if (!records || records.length < 2) return null
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))
  const prev = sorted[sorted.length - 2]
  const last = sorted[sorted.length - 1]
  const change = +(last.close - prev.close).toFixed(2)
  const changePercent = +(change / prev.close * 100).toFixed(2)
  return { price: last.close, change, changePercent }
}

async function fetchSymbolPrice(symbol) {
  if (!process.env.FINMIND_TOKEN) throw new Error('FINMIND_TOKEN is not set')
  const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const params = new URLSearchParams({
    dataset: 'TaiwanStockPrice',
    data_id: symbol,
    start_date: startDate,
    token: process.env.FINMIND_TOKEN,
  })
  const res = await fetch(`https://api.finmindtrade.com/api/v4/data?${params}`)
  if (!res.ok) throw new Error(`FinMind API error: ${res.status}`)
  const json = await res.json()
  return parsePriceRecords(json.data)
}

export async function getPrices(symbols) {
  if (!symbols || symbols.length === 0) return {}
  const key = getCacheKey()
  if (cache.key !== key) {
    // New window: clear all cached data
    cache = { key, data: new Map() }
  }
  // Fetch only symbols not yet cached
  const missing = symbols.filter((s) => !cache.data.has(s))
  if (missing.length > 0) {
    const entries = await Promise.all(
      missing.map(async (s) => {
        try {
          return [s, await fetchSymbolPrice(s)]
        } catch {
          return [s, null]
        }
      })
    )
    for (const [s, v] of entries) if (v !== null) cache.data.set(s, v)
  }
  return Object.fromEntries(symbols.map((s) => [s, cache.data.get(s) ?? null]))
}
