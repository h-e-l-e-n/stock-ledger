'use client'

import { useState } from 'react'

const W = 560, H = 220
const PL = 64, PR = 16, PT = 16, PB = 32
const CW = W - PL - PR
const CH = H - PT - PB

function toX(i, total) {
  if (total === 1) return PL + CW / 2
  return PL + i * (CW / (total - 1))
}

function CostChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-400 py-8">尚無資料</p>
  }

  const values = data.map((d) => d.cost)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const padding = (rawMax - rawMin) * 0.15 || rawMin * 0.1 || 100000
  const yMin = Math.max(0, rawMin - padding)
  const yMax = rawMax + padding

  function toY(v) {
    return PT + CH - ((v - yMin) / (yMax - yMin)) * CH
  }

  const yLabels = Array.from({ length: 4 }, (_, i) =>
    Math.round(yMin + ((yMax - yMin) * i) / 3)
  )

  const points = data.map((d, i) => `${toX(i, data.length)},${toY(d.cost)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" className="overflow-visible">
      {yLabels.map((v) => (
        <g key={v}>
          <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke="#e5e7eb" strokeWidth={1} />
          <text x={PL - 6} y={toY(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${Math.round(v / 1000)}K`}
          </text>
        </g>
      ))}
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={3} />
      {data.map((d, i) => (
        <g key={d.month}>
          <circle cx={toX(i, data.length)} cy={toY(d.cost)} r={4} fill="#3b82f6" />
          {(data.length <= 12 || i % Math.ceil(data.length / 12) === 0) && (
            <text x={toX(i, data.length)} y={H - 6} textAnchor="middle" fontSize={10} fill="#9ca3af">
              {d.month.slice(2)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function filterSeries(costSeries, range) {
  if (range === '月') {
    return costSeries.slice(-12)
  }
  if (range === '季') {
    const last3Years = costSeries.slice(-36)
    const quarterMonths = ['03', '06', '09', '12']
    const quarterly = last3Years.filter((d) => quarterMonths.includes(d.month.slice(5, 7)))
    if (last3Years.length > 0 && !quarterly.includes(last3Years[last3Years.length - 1])) {
      quarterly.push(last3Years[last3Years.length - 1])
    }
    return quarterly
  }
  // 年 — all history, one point per year
  const byYear = new Map()
  for (const d of costSeries) {
    byYear.set(d.month.slice(0, 4), d)
  }
  return [...byYear.values()]
}

function formatReturn(val) {
  if (val == null) return { text: '—', color: 'text-gray-400' }
  const sign = val >= 0 ? '+' : ''
  return {
    text: `${sign}${val.toFixed(1)}%`,
    color: val >= 0 ? 'text-green-600' : 'text-red-600',
  }
}

function formatPnl(val) {
  if (val == null) return { text: 'NT$ 0', color: 'text-gray-900' }
  const sign = val >= 0 ? '+' : ''
  return {
    text: `${sign}NT$ ${Math.abs(val).toLocaleString()}`,
    color: val >= 0 ? 'text-green-600' : 'text-red-600',
  }
}

function formatWinRate(winRate) {
  if (winRate.rate == null) return { text: '—', color: 'text-gray-400' }
  return { text: `${winRate.rate.toFixed(1)}%`, color: 'text-blue-600' }
}

export default function PerformanceClient({
  costSeries,
  annualizedReturn,
  realizedPnl,
  winRate,
}) {
  const [range, setRange] = useState('月')
  const filtered = filterSeries(costSeries, range)

  const ret = formatReturn(annualizedReturn)
  const pnl = formatPnl(realizedPnl)
  const wr = formatWinRate(winRate)

  const metrics = [
    {
      label: '年化報酬率',
      ...ret,
      bgColor: annualizedReturn == null ? 'bg-gray-50' : annualizedReturn >= 0 ? 'bg-green-50' : 'bg-red-50',
      borderColor: annualizedReturn == null ? 'border-gray-200' : annualizedReturn >= 0 ? 'border-green-200' : 'border-red-200',
    },
    {
      label: '已實現損益',
      ...pnl,
      bgColor: realizedPnl > 0 ? 'bg-green-50' : realizedPnl < 0 ? 'bg-red-50' : 'bg-gray-50',
      borderColor: realizedPnl > 0 ? 'border-green-200' : realizedPnl < 0 ? 'border-red-200' : 'border-gray-200',
    },
    {
      label: '勝率',
      ...wr,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  ]

  return (
    <>
      <div className="flex gap-2 mb-6">
        {['月', '季', '年'].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              range === r
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {r}度
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className={`bg-white rounded-xl shadow-sm p-6 border ${m.borderColor}`}>
            <h3 className="text-sm font-medium text-gray-600 mb-4">{m.label}</h3>
            <p className={`text-4xl font-bold ${m.color}`}>{m.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">投入成本走勢</h3>
        <CostChart data={filtered} />
      </div>
    </>
  )
}
