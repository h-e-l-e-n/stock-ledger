import { getRows } from '@/lib/sheets'
import DonutChart from '@/components/dashboard/donut-chart'
import BarChart from '@/components/fund-management/bar-chart'

export const dynamic = 'force-dynamic'

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-600'   },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-600'  },
}

const POOL_CONFIG = {
  '定期定額': { id: 'regular', color: 'blue',   description: '每月穩健投資，長期複利成長' },
  '貸款資金': { id: 'loan',    color: 'purple', description: '槓桿操作，追求高報酬' },
  '閒錢操作': { id: 'idle',    color: 'green',  description: '靈活進出，短線波段操作' },
}

export function groupByFundSource(positions) {
  const map = {}
  for (const p of positions) {
    if (!p.fundSource) continue
    if (!map[p.fundSource]) map[p.fundSource] = { cost: 0 }
    map[p.fundSource].cost += p.shares * p.costPrice
  }
  return map
}

const LEGEND_ITEMS = [
  { label: '定期定額', color: '#3b82f6' },
  { label: '貸款資金', color: '#8b5cf6' },
  { label: '閒錢操作', color: '#10b981' },
]

const POOL_COLORS = { '定期定額': '#3b82f6', '貸款資金': '#8b5cf6', '閒錢操作': '#10b981' }

const performanceComparison = [
  { month: '1月', 定期定額: 5.2,  貸款資金: 8.1,  閒錢操作:  2.3  },
  { month: '2月', 定期定額: 6.1,  貸款資金: 9.5,  閒錢操作: -1.2  },
  { month: '3月', 定期定額: 6.8,  貸款資金: 10.2, 閒錢操作:  0.8  },
  { month: '4月', 定期定額: 7.5,  貸款資金: 9.8,  閒錢操作:  1.5  },
  { month: '5月', 定期定額: 8.0,  貸款資金: 10.5, 閒錢操作:  1.2  },
  { month: '6月', 定期定額: 8.33, 貸款資金: 10.0, 閒錢操作:  1.89 },
]

function PoolIcon({ id, className }) {
  const shared = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', className, 'aria-hidden': 'true' }
  if (id === 'regular') return (
    <svg {...shared}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
  if (id === 'loan') return (
    <svg {...shared}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
  return (
    <svg {...shared}>
      <path d="M20 12V22H4a2 2 0 01-2-2V6a2 2 0 012-2h16v8"/>
      <path d="M20 12H14a2 2 0 000 4h6v-4z"/>
    </svg>
  )
}

export default async function FundManagement() {
  let positions = []
  try {
    const rows = await getRows('持倉')
    positions = rows.map((row) => ({
      fundSource: row['資金來源'],
      shares: Number(row['股數']),
      costPrice: Number(row['成本價']),
    }))
  } catch (err) {
    console.error('Failed to load positions for fund management:', err.message)
  }

  const grouped = groupByFundSource(positions)

  const fundPools = Object.entries(POOL_CONFIG).map(([name, cfg]) => ({
    ...cfg,
    name,
    cost: Math.round(grouped[name]?.cost ?? 0),
    totalAsset: Math.round(grouped[name]?.cost ?? 0),
    profit: 0,
    profitRate: 0,
  }))

  const totalCost = fundPools.reduce((s, p) => s + p.cost, 0)

  const allocationData = fundPools.map((p) => ({
    name: p.name,
    code: '',
    value: p.cost,
    color: POOL_COLORS[p.name],
  }))

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">資金管理</h1>
        <p className="text-gray-500 mt-2">三種資金池的總覽與績效對比</p>
      </div>

      <div className="bg-linear-to-br from-slate-700 to-slate-900 rounded-xl shadow-lg p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
          <h2 className="text-xl font-semibold">總投入成本</h2>
        </div>
        <p className="text-5xl font-bold mb-2">NT$ {totalCost.toLocaleString()}</p>
        <p className="text-slate-300 text-sm">現值損益待 FinMind 串接後計算</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {fundPools.map((pool) => {
          const c = COLOR_MAP[pool.color]
          return (
            <div key={pool.id} className={`bg-white rounded-xl shadow-sm p-6 border-2 ${c.border} transition-all`}>
              <div className="flex items-center gap-2 mb-1">
                <PoolIcon id={pool.id} className={`w-6 h-6 ${c.text}`} />
                <h3 className="text-lg font-bold text-gray-900">{pool.name}</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">{pool.description}</p>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">投入成本</p>
                  <p className="text-2xl font-bold text-gray-900">NT$ {pool.cost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">報酬率趨勢對比</h3>
          <div className="flex gap-4 mb-4">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
          <BarChart data={performanceComparison} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">資金配置比例</h3>
          <DonutChart positions={allocationData} />
        </div>
      </div>
    </div>
  )
}
