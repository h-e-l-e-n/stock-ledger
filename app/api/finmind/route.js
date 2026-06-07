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
