import { getRows } from '@/lib/sheets'
import StatCard from '@/components/dashboard/stat-card'
import PositionsTable from '@/components/positions/positions-table'

export default async function PositionsPage() {
  const rows = await getRows('持倉')
  const positions = rows.map((row) => ({
    code: row['股票代號'],
    name: row['股票名稱'],
    shares: Number(row['股數']),
    costPrice: Number(row['成本價']),
    currentPrice: null,
  }))

  const totalCost = positions.reduce((s, p) => s + p.costPrice * p.shares, 0)

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">持倉清單</h1>
        <p className="text-sm text-gray-500 mt-1">目前持有的股票投資組合</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <StatCard label="持倉成本" value={`NT$ ${totalCost.toLocaleString()}`} />
        <StatCard label="總損益" value="—" />
        <StatCard label="持股檔數" value={`${positions.length}`} />
      </div>

      <PositionsTable positions={positions} />
    </main>
  )
}
