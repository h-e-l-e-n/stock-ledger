const SERIES = [
  { key: '定期定額', color: '#3b82f6' },
  { key: '貸款資金', color: '#8b5cf6' },
  { key: '閒錢操作', color: '#10b981' },
]

const W = 480, H = 240
const PL = 42, PR = 12, PT = 12, PB = 28
const CW = W - PL - PR
const CH = H - PT - PB
const Y_MIN = -2, Y_MAX = 12, Y_RANGE = Y_MAX - Y_MIN
const GROUP_W = CW / 6
const BAR_W = 12
const BAR_GAP = 3
const GROUP_SPAN = SERIES.length * BAR_W + (SERIES.length - 1) * BAR_GAP
const GROUP_INNER = (GROUP_W - GROUP_SPAN) / 2
const Y_LABELS = [-2, 0, 2, 4, 6, 8, 10, 12]

function toY(v) {
  return PT + CH - ((v - Y_MIN) / Y_RANGE) * CH
}

const ZERO_Y = toY(0)

export default function BarChart({ data }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" className="overflow-visible">
      {Y_LABELS.map((v) => (
        <line
          key={v}
          x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)}
          stroke={v === 0 ? '#9ca3af' : '#e5e7eb'}
          strokeWidth={v === 0 ? 1.5 : 1}
        />
      ))}
      {Y_LABELS.map((v) => (
        <text
          key={v}
          x={PL - 6} y={toY(v) + 4}
          textAnchor="end"
          fontSize={10}
          fill="#9ca3af"
        >
          {v}%
        </text>
      ))}
      {data.map((d, i) =>
        SERIES.map((s, j) => {
          const v = d[s.key]
          const barX = PL + i * GROUP_W + GROUP_INNER + j * (BAR_W + BAR_GAP)
          const barY = v >= 0 ? toY(v) : ZERO_Y
          const barH = Math.max(Math.abs(toY(v) - ZERO_Y), 1)
          return (
            <rect
              key={`${i}-${j}`}
              x={barX} y={barY}
              width={BAR_W} height={barH}
              fill={s.color}
              rx={2}
            />
          )
        })
      )}
      {data.map((d, i) => (
        <text
          key={d.month}
          x={PL + i * GROUP_W + GROUP_W / 2}
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
