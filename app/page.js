import { getRows } from '@/lib/sheets'
import { getPrices } from '@/lib/prices'
import { aggregateTrades } from '@/lib/positions'
import StatCard from '@/components/dashboard/stat-card'
import DonutChart from '@/components/dashboard/donut-chart'
import TradesTable from '@/components/dashboard/trades-table'

export const dynamic = 'force-dynamic'

const FUND_COLORS = {
  '定期定額': '#3b82f6',
  '貸款資金': '#8b5cf6',
  '閒錢操作': '#10b981',
}

export function computeDashboardStats(positions) {
  const netAssets = positions.reduce((s, p) => {
    return s + (p.currentPrice != null ? p.currentPrice * p.shares : p.costPrice * p.shares)
  }, 0)

  const priced = positions.filter((p) => p.currentPrice != null && p.change != null)
  if (priced.length === 0) return { netAssets, todayPnl: null, todayPct: null }

  const todayPnl = priced.reduce((s, p) => s + p.change * p.shares, 0)
  const prevValue = priced.reduce((s, p) => s + (p.currentPrice - p.change) * p.shares, 0)
  const todayPct = prevValue > 0 ? (todayPnl / prevValue) * 100 : null

  return { netAssets, todayPnl, todayPct }
}

export function toDonutPositions(positions) {
  return positions
    .map((p) => ({
      name: p.name,
      code: p.code,
      value: p.currentPrice != null ? p.currentPrice * p.shares : p.costPrice * p.shares,
      color: FUND_COLORS[p.fundSource] ?? '#94a3b8',
    }))
    .filter((p) => p.value > 0)
}

export default async function DashboardPage() {
  let positions = []
  let recentTrades = []

  try {
    const tradeRows = await getRows('交易記錄')
    const trades = tradeRows.map((row) => ({
      date: row['日期'],
      type: row['類型'],
      fundSource: row['資金來源'],
      symbol: row['股票代號'],
      name: row['股票名稱'],
      shares: Number(row['股數']) * 1000,
      amount: Number(row['金額']),
      fee: Number(row['手續費']),
    }))
    const rawPositions = aggregateTrades(trades)

    const symbols = [...new Set(rawPositions.map((p) => p.code))]
    const prices = symbols.length > 0 ? await getPrices(symbols) : {}

    positions = rawPositions.map((p) => ({
      ...p,
      currentPrice: prices[p.code]?.price ?? null,
      change: prices[p.code]?.change ?? null,
    }))

    recentTrades = tradeRows.slice(-5).reverse().map((row) => ({
      date: row['日期'],
      type: row['類型'],
      name: row['股票名稱'],
      code: row['股票代號'],
      amount: Number(row['金額']),
    }))
  } catch (err) {
    console.error('Dashboard data failed:', err.message)
  }

  const { netAssets, todayPnl, todayPct } = computeDashboardStats(positions)
  const donutPositions = toDonutPositions(positions)

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Dashboard 總覽</h1>
      <p className="text-sm text-gray-500 mb-7">資產追蹤與最新動態</p>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <StatCard
          label="資產淨值"
          value={`NT$ ${Math.round(netAssets).toLocaleString()}`}
        />
        <StatCard
          label="今日損益"
          value={todayPnl != null ? `NT$ ${Math.round(todayPnl).toLocaleString()}` : '—'}
          change={todayPct}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">持倉概況</h2>
          <DonutChart positions={donutPositions} />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <TradesTable trades={recentTrades} limit={5} />
        </div>
      </div>
    </main>
  )
}
