import { getRows } from '@/lib/sheets'
import { getPrices } from '@/lib/prices'
import { aggregateTrades } from '@/lib/positions'
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

export function groupByFundSource(positions, prices = {}) {
  const map = {}
  for (const p of positions) {
    if (!p.fundSource) continue
    if (!map[p.fundSource]) map[p.fundSource] = { cost: 0, totalAsset: 0 }
    const posCost = p.shares * p.costPrice
    const currentPrice = prices[p.code]?.price
    map[p.fundSource].cost += posCost
    map[p.fundSource].totalAsset += currentPrice != null ? p.shares * currentPrice : posCost
  }
  return map
}

const LEGEND_ITEMS = [
  { label: '定期定額', color: '#3b82f6' },
  { label: '貸款資金', color: '#8b5cf6' },
  { label: '閒錢操作', color: '#10b981' },
]

const POOL_COLORS = { '定期定額': '#3b82f6', '貸款資金': '#8b5cf6', '閒錢操作': '#10b981' }

export function computeMonthlyInvestment(tradeRows) {
  const map = {}
  for (const row of tradeRows) {
    if (row['類型'] !== '買入') continue
    const date = row['日期']
    if (!date) continue
    const parts = date.replace(/-/g, '/').split('/')
    if (parts.length < 2) continue
    const sortKey = `${parts[0]}/${parts[1].padStart(2, '0')}`
    const label = `${parseInt(parts[1])}月`
    const fund = row['資金來源']
    const amount = Number(row['金額'])
    if (!map[sortKey]) map[sortKey] = { month: label, 定期定額: 0, 貸款資金: 0, 閒錢操作: 0 }
    if (fund && fund in map[sortKey]) map[sortKey][fund] += amount
  }
  return Object.keys(map).sort().map((k) => map[k])
}

function buildYAxis(data) {
  const POOLS = ['定期定額', '貸款資金', '閒錢操作']
  const maxVal = Math.max(...data.flatMap((d) => POOLS.map((k) => d[k] ?? 0)), 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)))
  const yMax = Math.ceil(maxVal / magnitude) * magnitude
  const step = yMax / 4
  const yLabels = [0, step, step * 2, step * 3, yMax]
  const formatY = (v) => v >= 10000 ? `${Math.round(v / 10000)}萬` : `${v}`
  return { yMin: 0, yMax, yLabels, formatY }
}

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
  let monthlyData = []
  try {
    const rows = await getRows('交易記錄')
    monthlyData = computeMonthlyInvestment(rows)
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
    positions = aggregateTrades(trades)
  } catch (err) {
    console.error('Failed to load positions for fund management:', err.message)
  }

  const symbols = [...new Set(positions.map((p) => p.code).filter(Boolean))]
  const prices = symbols.length > 0 ? await getPrices(symbols) : {}

  const grouped = groupByFundSource(positions, prices)

  const fundPools = Object.entries(POOL_CONFIG).map(([name, cfg]) => {
    const cost = Math.round(grouped[name]?.cost ?? 0)
    const totalAsset = Math.round(grouped[name]?.totalAsset ?? cost)
    const profit = totalAsset - cost
    const profitRate = cost > 0 ? +(profit / cost * 100).toFixed(2) : null
    return { ...cfg, name, cost, totalAsset, profit, profitRate }
  })

  const totalCost = fundPools.reduce((s, p) => s + p.cost, 0)
  const yAxis = buildYAxis(monthlyData)

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
        <p className="text-slate-300 text-sm">各資金池損益詳見下方卡片</p>
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
                <div>
                  <p className="text-sm text-gray-500 mb-1">目前價值</p>
                  <p className="text-xl font-semibold text-gray-900">NT$ {pool.totalAsset.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">損益</p>
                    <p className={`text-lg font-semibold ${pool.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pool.profit >= 0 ? '+' : ''}NT$ {pool.profit.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">報酬率</p>
                    <p className={`text-lg font-semibold ${pool.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pool.profitRate != null ? `${pool.profit >= 0 ? '+' : ''}${pool.profitRate}%` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">每月買入金額</h3>
          <div className="flex gap-4 mb-4">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
          {monthlyData.length > 0
            ? <BarChart data={monthlyData} {...yAxis} />
            : <p className="text-sm text-gray-400 text-center py-8">尚無交易記錄</p>
          }
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">資金配置比例</h3>
          <DonutChart positions={allocationData} />
        </div>
      </div>
    </div>
  )
}
