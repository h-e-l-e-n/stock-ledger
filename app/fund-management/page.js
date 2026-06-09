import DonutChart from '@/components/dashboard/donut-chart'
import BarChart from '@/components/fund-management/bar-chart'

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-600'   },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-600'  },
}

const fundPools = [
  {
    id: 'regular',
    name: '定期定額',
    color: 'blue',
    totalAsset: 520000,
    cost: 480000,
    profit: 40000,
    profitRate: 8.33,
    description: '每月穩健投資，長期複利成長',
  },
  {
    id: 'loan',
    name: '貸款資金',
    color: 'purple',
    totalAsset: 385000,
    cost: 350000,
    profit: 35000,
    profitRate: 10.0,
    description: '槓桿操作，追求高報酬',
  },
  {
    id: 'idle',
    name: '閒錢操作',
    color: 'green',
    totalAsset: 377000,
    cost: 370000,
    profit: 7000,
    profitRate: 1.89,
    description: '靈活進出，短線波段操作',
  },
]

const performanceComparison = [
  { month: '1月', 定期定額: 5.2,  貸款資金: 8.1,  閒錢操作:  2.3  },
  { month: '2月', 定期定額: 6.1,  貸款資金: 9.5,  閒錢操作: -1.2  },
  { month: '3月', 定期定額: 6.8,  貸款資金: 10.2, 閒錢操作:  0.8  },
  { month: '4月', 定期定額: 7.5,  貸款資金: 9.8,  閒錢操作:  1.5  },
  { month: '5月', 定期定額: 8.0,  貸款資金: 10.5, 閒錢操作:  1.2  },
  { month: '6月', 定期定額: 8.33, 貸款資金: 10.0, 閒錢操作:  1.89 },
]

const allocationData = [
  { name: '定期定額', code: '', value: 520000, color: '#3b82f6' },
  { name: '貸款資金', code: '', value: 385000, color: '#8b5cf6' },
  { name: '閒錢操作', code: '', value: 377000, color: '#10b981' },
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

const LEGEND_ITEMS = [
  { label: '定期定額', color: '#3b82f6' },
  { label: '貸款資金', color: '#8b5cf6' },
  { label: '閒錢操作', color: '#10b981' },
]

export default function FundManagement() {
  const totalAssets = fundPools.reduce((sum, p) => sum + p.totalAsset, 0)
  const totalProfit = fundPools.reduce((sum, p) => sum + p.profit, 0)
  const totalProfitRate = (totalProfit / (totalAssets - totalProfit)) * 100

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">資金管理</h1>
        <p className="text-gray-500 mt-2">三種資金池的總覽與績效對比</p>
      </div>

      {/* 總資產概覽 */}
      <div className="bg-linear-to-br from-slate-700 to-slate-900 rounded-xl shadow-lg p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
          <h2 className="text-xl font-semibold">總資產</h2>
        </div>
        <p className="text-5xl font-bold mb-2">NT$ {totalAssets.toLocaleString()}</p>
        <div className="flex items-baseline gap-4 text-lg">
          <span className="text-gray-300">總損益</span>
          <span className="text-green-400 font-semibold">
            +NT$ {totalProfit.toLocaleString()} (+{totalProfitRate.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* 三個資金池卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {fundPools.map((pool) => {
          const c = COLOR_MAP[pool.color]
          const isPositive = pool.profit >= 0
          return (
            <div key={pool.id} className={`bg-white rounded-xl shadow-sm p-6 border-2 ${c.border} transition-all`}>
              <div className="flex items-center gap-2 mb-1">
                <PoolIcon id={pool.id} className={`w-6 h-6 ${c.text}`} />
                <h3 className="text-lg font-bold text-gray-900">{pool.name}</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">{pool.description}</p>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">資產淨值</p>
                  <p className="text-2xl font-bold text-gray-900">NT$ {pool.totalAsset.toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">損益</span>
                  <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}NT$ {pool.profit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">報酬率</span>
                  <span className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{pool.profitRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 績效對比圖 */}
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

        {/* 資金配置圓餅圖 */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">資金配置比例</h3>
          <DonutChart positions={allocationData} />
        </div>
      </div>

      {/* 績效統計 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">績效統計比較</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['資金池', '投入成本', '目前資產', '損益金額', '報酬率'].map((h, i) => (
                  <th key={h} className={`py-4 px-6 text-sm font-semibold text-gray-700 ${i === 0 ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fundPools.map((pool) => {
                const c = COLOR_MAP[pool.color]
                return (
                  <tr key={`stat-${pool.id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${c.bg} border-2 ${c.border}`} />
                        <span className="font-semibold text-gray-900">{pool.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right text-gray-700">NT$ {pool.cost.toLocaleString()}</td>
                    <td className="py-4 px-6 text-right font-semibold text-gray-900">NT$ {pool.totalAsset.toLocaleString()}</td>
                    <td className="py-4 px-6 text-right">
                      <span className={`font-bold ${pool.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pool.profit >= 0 ? '+' : ''}NT$ {pool.profit.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className={`text-lg font-bold ${pool.profitRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pool.profitRate >= 0 ? '+' : ''}{pool.profitRate.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
