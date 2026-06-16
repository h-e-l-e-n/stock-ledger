import { getRows } from '@/lib/sheets'
import { getPrices } from '@/lib/prices'
import { aggregateTrades } from '@/lib/positions'
import StatCard from '@/components/dashboard/stat-card'
import PositionsTable from '@/components/positions/positions-table'

export const dynamic = 'force-dynamic'

export default async function PositionsPage() {
  let positions = []
  try {
    const rows = await getRows('交易記錄')
    const trades = rows.map((row) => ({
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
    }))
  } catch (err) {
    console.error('Failed to load positions:', err.message)
  }

  const totalCost = positions.reduce((s, p) => s + p.costPrice * p.shares, 0)

  const pricedPositions = positions.filter((p) => p.currentPrice != null)
  const totalPnl = pricedPositions.length > 0
    ? pricedPositions.reduce((s, p) => s + (p.currentPrice - p.costPrice) * p.shares, 0)
    : null

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">持倉清單</h1>
        <p className="text-sm text-gray-500 mt-1">目前持有的股票投資組合</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <StatCard label="持倉成本" value={`NT$ ${Math.round(totalCost).toLocaleString()}`} />
        <StatCard
          label="總損益"
          value={totalPnl != null ? `NT$ ${Math.round(totalPnl).toLocaleString()}` : '—'}
          sentiment={totalPnl}
        />
        <StatCard label="持股檔數" value={`${positions.length}`} />
      </div>

      <PositionsTable positions={positions} />
    </main>
  )
}
