export default function StatCard({ label, value, change, sentiment }) {
  const colorSource = change ?? sentiment
  const isPositive = colorSource > 0
  const isNegative = colorSource < 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <p className={`text-3xl font-extrabold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
        {change != null && change !== 0 && (
          <span className={`inline-flex items-center gap-1 text-sm font-semibold ml-2 align-middle ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              {isPositive
                ? <polyline points="18 15 12 9 6 15"/>
                : <polyline points="6 9 12 15 18 9"/>
              }
            </svg>
            {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </p>
    </div>
  )
}
