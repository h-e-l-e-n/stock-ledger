import StatCard from '@/components/dashboard/stat-card'
import DonutChart from '@/components/dashboard/donut-chart'
import TradesTable from '@/components/dashboard/trades-table'

const mockStats = {
  netAssets: 1282000,
  todayPnl: 15800,
  todayPct: 1.25,
}

const mockPositions = [
  { name: '台積電', code: '2330', value: 450000, color: '#4f46e5' },
  { name: '聯發科', code: '2454', value: 320000, color: '#7c3aed' },
  { name: '鴻海',   code: '2317', value: 256000, color: '#ec4899' },
  { name: '其他',   code: '',     value: 256000, color: '#f59e0b' },
]

const mockTrades = [
  { date: '2026-06-05', type: '買入', name: '台積電', code: '2330', amount: 5800 },
  { date: '2026-06-03', type: '賣出', name: '聯發科', code: '2454', amount: 5600 },
  { date: '2026-06-01', type: '買入', name: '鴻海',   code: '2317', amount: 2100 },
]

export default function DashboardPage() {
  const pnlSign = mockStats.todayPnl >= 0 ? '+' : ''

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Dashboard 總覽</h1>
      <p className="text-sm text-gray-500 mb-7">資產追蹤與最新動態</p>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <StatCard
          label="資產淨值"
          value={`NT$ ${mockStats.netAssets.toLocaleString()}`}
        />
        <StatCard
          label="今日損益"
          value={`${pnlSign}NT$ ${mockStats.todayPnl.toLocaleString()}`}
          change={mockStats.todayPct}
        />
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">持倉概況</h2>
          <DonutChart positions={mockPositions} />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <TradesTable trades={mockTrades} />
        </div>
      </div>
    </main>
  )
}
