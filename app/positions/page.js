import StatCard from '@/components/dashboard/stat-card'
import PositionsTable from '@/components/positions/positions-table'

const mockPositions = [
  { code: '2317', name: '鴻海',   shares: 200, costPrice: 108,  currentPrice: 105  },
  { code: '2330', name: '台積電', shares: 100, costPrice: 520,  currentPrice: 580  },
  { code: '2412', name: '中華電', shares: 80,  costPrice: 118,  currentPrice: 120  },
  { code: '2454', name: '聯發科', shares: 50,  costPrice: 1050, currentPrice: 1120 },
  { code: '2882', name: '國泰金', shares: 150, costPrice: 42,   currentPrice: 45   },
]

export default function PositionsPage() {
  const totalValue = mockPositions.reduce((s, p) => s + p.currentPrice * p.shares, 0)
  const totalPnl = mockPositions.reduce((s, p) => s + (p.currentPrice - p.costPrice) * p.shares, 0)
  const pnlPct = (totalPnl / (totalValue - totalPnl)) * 100
  const pnlSign = totalPnl >= 0 ? '+' : '-'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">持倉清單</h1>
        <p className="text-sm text-gray-500 mt-1">目前持有的股票投資組合</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <StatCard label="持倉總市值" value={`NT$ ${totalValue.toLocaleString()}`} />
        <StatCard
          label="總損益"
          value={`NT$ ${pnlSign}${Math.abs(totalPnl).toLocaleString()}`}
          change={pnlPct}
        />
        <StatCard label="持股檔數" value={`${mockPositions.length}`} />
      </div>

      <PositionsTable positions={mockPositions} />
    </div>
  )
}
