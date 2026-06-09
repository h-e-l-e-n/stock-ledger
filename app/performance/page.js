'use client'

import { useState } from 'react'

const performanceData = [
  { date: '2026-01', portfolio: 1000000, market: 1000000 },
  { date: '2026-02', portfolio: 1050000, market: 1020000 },
  { date: '2026-03', portfolio: 1120000, market: 1050000 },
  { date: '2026-04', portfolio: 1080000, market: 1040000 },
  { date: '2026-05', portfolio: 1200000, market: 1100000 },
  { date: '2026-06', portfolio: 1282000, market: 1150000 },
]

const metrics = [
  {
    label: '年化報酬率',
    value: '28.2%',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: (
      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
  },
  {
    label: '最大回撤',
    value: '-8.5%',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: (
      <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
        <polyline points="17 18 23 18 23 12"/>
      </svg>
    ),
  },
  {
    label: '勝率',
    value: '65%',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: (
      <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
]

const W = 560, H = 280
const PL = 56, PR = 16, PT = 16, PB = 32
const CW = W - PL - PR
const CH = H - PT - PB
const Y_MIN = 900000, Y_MAX = 1400000
const Y_LABELS = [1000000, 1100000, 1200000, 1300000]

function toX(i, total) {
  return PL + i * (CW / (total - 1))
}

function toY(v) {
  return PT + CH - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * CH
}

function PerformanceLineChart({ data }) {
  const portfolioPoints = data.map((d, i) => `${toX(i, data.length)},${toY(d.portfolio)}`).join(' ')
  const marketPoints = data.map((d, i) => `${toX(i, data.length)},${toY(d.market)}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" className="overflow-visible">
        {Y_LABELS.map((v) => (
          <g key={v}>
            <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={PL - 6} y={toY(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
              {v / 1000}K
            </text>
          </g>
        ))}
        <polyline points={marketPoints} fill="none" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" />
        <polyline points={portfolioPoints} fill="none" stroke="#3b82f6" strokeWidth={3} />
        {data.map((d, i) => (
          <g key={d.date}>
            <circle cx={toX(i, data.length)} cy={toY(d.market)} r={3} fill="#9ca3af" />
            <circle cx={toX(i, data.length)} cy={toY(d.portfolio)} r={4} fill="#3b82f6" />
            <text x={toX(i, data.length)} y={H - 6} textAnchor="middle" fontSize={11} fill="#9ca3af">
              {d.date}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex gap-6 mt-2 justify-center">
        <span className="flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-block w-8 border-2 border-blue-500 rounded"></span>投資組合
        </span>
        <span className="flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-block w-8 border-2 border-gray-400 border-dashed rounded"></span>加權指數
        </span>
      </div>
    </div>
  )
}

export default function PerformancePage() {
  const [timeRange, setTimeRange] = useState('月')

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">績效分析</h1>
        <p className="text-gray-500 mt-2">投資組合表現與市場比較</p>
      </div>

      {/* 時間範圍選擇 */}
      <div className="flex gap-2 mb-6">
        {['月', '季', '年'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {range}度
          </button>
        ))}
      </div>

      {/* 關鍵指標 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric) => (
          <div key={metric.label} className={`bg-white rounded-xl shadow-sm p-6 border ${metric.borderColor}`}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">{metric.label}</h3>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>{metric.icon}</div>
            </div>
            <p className={`text-4xl font-bold ${metric.color}`}>{metric.value}</p>
          </div>
        ))}
      </div>

      {/* 績效走勢圖 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">資產淨值走勢 vs 大盤指數</h3>
        <PerformanceLineChart data={performanceData} />
      </div>

      {/* 績效摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">期間績效</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">期初資產</span>
              <span className="font-semibold text-gray-900">NT$ 1,000,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">期末資產</span>
              <span className="font-semibold text-gray-900">NT$ 1,282,000</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-gray-600">總報酬</span>
              <span className="font-bold text-green-600 text-lg">+NT$ 282,000 (+28.2%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">相對表現</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">投資組合報酬</span>
              <span className="font-semibold text-green-600">+28.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">大盤報酬</span>
              <span className="font-semibold text-gray-900">+15.0%</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-gray-600">超額報酬 (Alpha)</span>
              <span className="font-bold text-blue-600 text-lg">+13.2%</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
