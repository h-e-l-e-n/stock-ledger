const yearlyDividends = [
  { year: '2022', amount: 12500 },
  { year: '2023', amount: 18200 },
  { year: '2024', amount: 24800 },
  { year: '2025', amount: 31200 },
  { year: '2026', amount: 15600 },
]

const stockDividends = [
  { symbol: '2330', name: '台積電', totalDividends: 32000, avgYield: 2.8 },
  { symbol: '2454', name: '聯發科', totalDividends: 28500, avgYield: 3.2 },
  { symbol: '2882', name: '國泰金', totalDividends: 18900, avgYield: 5.5 },
  { symbol: '2412', name: '中華電', totalDividends: 14200, avgYield: 4.8 },
  { symbol: '2317', name: '鴻海',   totalDividends: 8700,  avgYield: 4.2 },
]

const W = 480, H = 220
const PL = 52, PR = 16, PT = 12, PB = 28
const CW = W - PL - PR
const CH = H - PT - PB
const Y_MAX = 35000
const BAR_W = 48
const GROUP_W = CW / yearlyDividends.length
const Y_LABELS = [0, 10000, 20000, 30000]

function toY(v) {
  return PT + CH - (v / Y_MAX) * CH
}

function DividendBarChart() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" className="overflow-visible">
      {Y_LABELS.map((v) => (
        <g key={v}>
          <line
            x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)}
            stroke={v === 0 ? '#9ca3af' : '#e5e7eb'} strokeWidth={1}
          />
          <text x={PL - 6} y={toY(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {v === 0 ? '0' : `${v / 1000}K`}
          </text>
        </g>
      ))}
      {yearlyDividends.map((d, i) => {
        const barX = PL + i * GROUP_W + (GROUP_W - BAR_W) / 2
        const barY = toY(d.amount)
        const barH = CH - (barY - PT)
        return (
          <g key={d.year}>
            <rect x={barX} y={barY} width={BAR_W} height={barH} fill="#10b981" rx={4} />
            <text x={PL + i * GROUP_W + GROUP_W / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#9ca3af">
              {d.year}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function DividendsPage() {
  const totalDividends = stockDividends.reduce((sum, s) => sum + s.totalDividends, 0)

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">股利記錄</h1>
        <p className="text-gray-500 mt-2">歷年配息與殖利率統計</p>
      </div>

      {/* 累計股利總覽 */}
      <div className="bg-linear-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold">累計股利總額</h2>
        </div>
        <p className="text-5xl font-bold mb-2">NT$ {totalDividends.toLocaleString('en-US')}</p>
        <p className="text-green-100">歷年累積配息收入</p>
      </div>

      {/* 年度股利長條圖 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">年度股利收入趨勢</h3>
        <DividendBarChart />
      </div>

      {/* 各股殖利率表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">各股殖利率統計</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['股票代號', '股票名稱'].map((h) => (
                  <th key={h} className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
                {['累計股利', '平均殖利率'].map((h) => (
                  <th key={h} className="text-right py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stockDividends.map((stock) => (
                <tr key={stock.symbol} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 font-mono font-semibold text-gray-900">{stock.symbol}</td>
                  <td className="py-4 px-6 font-medium text-gray-700">{stock.name}</td>
                  <td className="py-4 px-6 text-right font-semibold text-green-600">
                    NT$ {stock.totalDividends.toLocaleString('en-US')}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                      {stock.avgYield.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 股利統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm text-gray-500 mb-2">今年累計股利</h3>
          <p className="text-3xl font-bold text-gray-900">NT$ 15,600</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm text-gray-500 mb-2">去年總股利</h3>
          <p className="text-3xl font-bold text-gray-900">NT$ 31,200</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm text-gray-500 mb-2">平均年化殖利率</h3>
          <p className="text-3xl font-bold text-green-600">3.8%</p>
        </div>
      </div>
    </main>
  )
}
