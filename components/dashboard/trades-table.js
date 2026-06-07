import Link from 'next/link'

export default function TradesTable({ trades, limit = 3 }) {
  const rows = trades.slice(0, limit)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900">近期交易記錄</h2>
        <Link href="/trades/new" className="text-sm text-blue-600 font-medium hover:underline">
          + 新增交易
        </Link>
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-xs text-gray-400 font-medium text-left pb-3 px-2">日期</th>
            <th className="text-xs text-gray-400 font-medium text-left pb-3 px-2">類型</th>
            <th className="text-xs text-gray-400 font-medium text-left pb-3 px-2">股票</th>
            <th className="text-xs text-gray-400 font-medium text-right pb-3 px-2">金額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((trade, i) => (
            <tr key={`${trade.date}-${trade.code}-${i}`} className="border-t border-gray-100">
              <td className="text-sm text-gray-700 py-3 px-2">{trade.date}</td>
              <td className="py-3 px-2">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                  trade.type === '買入'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {trade.type}
                </span>
              </td>
              <td className="text-sm text-gray-700 py-3 px-2">{trade.name} {trade.code}</td>
              <td className="text-sm font-semibold text-gray-900 py-3 px-2 text-right">
                NT$ {Number(trade.amount).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-center mt-4">
        <Link href="/trades" className="text-sm text-blue-600 font-medium hover:underline">
          查看所有交易記錄 →
        </Link>
      </div>
    </div>
  )
}
