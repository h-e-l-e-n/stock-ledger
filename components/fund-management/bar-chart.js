const SERIES = [
  { key: '定期定額', color: '#3b82f6' },
  { key: '貸款資金', color: '#8b5cf6' },
  { key: '閒錢操作', color: '#10b981' },
]

const W = 480, H = 240
const PL = 52, PR = 12, PT = 12, PB = 28
const CW = W - PL - PR
const CH = H - PT - PB
const BAR_GAP = 2

export default function BarChart({ data, yMin = 0, yMax = 12, yLabels = [0, 2, 4, 6, 8, 10, 12], formatY = (v) => `${v}%` }) {
  const yRange = yMax - yMin
  const groupCount = Math.max(data.length, 1)
  const groupW = CW / groupCount
  const barW = Math.min(14, Math.max(4, (groupW - 8) / SERIES.length - BAR_GAP))
  const groupSpan = SERIES.length * barW + (SERIES.length - 1) * BAR_GAP
  const groupInner = (groupW - groupSpan) / 2

  function toY(v) {
    return PT + CH - ((v - yMin) / yRange) * CH
  }
  const zeroY = toY(Math.max(yMin, 0))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" className="overflow-visible">
      {yLabels.map((v) => (
        <line
          key={v}
          x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)}
          stroke={v === 0 ? '#9ca3af' : '#e5e7eb'}
          strokeWidth={v === 0 ? 1.5 : 1}
        />
      ))}
      {yLabels.map((v) => (
        <text key={v} x={PL - 6} y={toY(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
          {formatY(v)}
        </text>
      ))}
      {data.map((d, i) =>
        SERIES.map((s, j) => {
          const v = d[s.key] ?? 0
          const barX = PL + i * groupW + groupInner + j * (barW + BAR_GAP)
          const barY = v >= 0 ? toY(v) : zeroY
          const barH = Math.max(Math.abs(toY(v) - zeroY), 1)
          return (
            <rect key={`${i}-${j}`} x={barX} y={barY} width={barW} height={barH} fill={s.color} rx={2} />
          )
        })
      )}
      {data.map((d, i) => (
        <text
          key={d.month}
          x={PL + i * groupW + groupW / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={11}
          fill="#9ca3af"
        >
          {d.month}
        </text>
      ))}
    </svg>
  )
}
