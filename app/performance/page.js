import { getRows } from '@/lib/sheets'
import { aggregateTrades } from '@/lib/positions'
import { getPrices } from '@/lib/prices'
import {
  buildCostSeries,
  computeRealizedPnl,
  computeWinRate,
  computeAnnualizedReturn,
} from '@/lib/performance'
import PerformanceClient from '@/components/performance/performance-client'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
  let costSeries = []
  let annualizedReturn = null
  let realizedPnl = 0
  let winRate = { wins: 0, total: 0, rate: null }

  try {
    const rows = await getRows('交易記錄')
    const trades = rows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']) * 1000,
      price: Number(row['價格']),
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))

    costSeries = buildCostSeries(trades)
    realizedPnl = computeRealizedPnl(trades)
    winRate = computeWinRate(trades)

    const rawPositions = aggregateTrades(trades)
    const symbols = [...new Set(rawPositions.map((p) => p.code))]
    const prices = symbols.length > 0 ? await getPrices(symbols) : {}
    annualizedReturn = computeAnnualizedReturn(trades, rawPositions, prices)
  } catch (err) {
    console.error('Failed to load performance data:', err)
  }

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">績效分析</h1>
        <p className="text-gray-500 mt-2">投資組合表現總覽</p>
      </div>
      <PerformanceClient
        costSeries={costSeries}
        annualizedReturn={annualizedReturn}
        realizedPnl={realizedPnl}
        winRate={winRate}
      />
    </main>
  )
}
