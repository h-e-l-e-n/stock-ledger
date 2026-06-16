'use client'
import { useState } from 'react'

const CX = 50, CY = 50, R = 45, INNER_R = 28

export function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function buildSegments(positions) {
  const total = positions.reduce((s, p) => s + p.value, 0)
  let startAngle = 0
  return positions.map((pos) => {
    const pct = (pos.value / total) * 100
    const sweep = (pct / 100) * 360
    let d
    if (sweep >= 360) {
      d = `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX} ${CY + R} A ${R} ${R} 0 1 1 ${CX} ${CY - R} Z`
    } else {
      const endAngle = startAngle + sweep
      const start = polarToCartesian(CX, CY, R, startAngle)
      const end = polarToCartesian(CX, CY, R, endAngle)
      const largeArc = sweep > 180 ? 1 : 0
      d = `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
      startAngle = endAngle
    }
    return { ...pos, pct, d }
  })
}

export default function DonutChart({ positions }) {
  const [hoveredKey, setHoveredKey] = useState(null)
  const segments = buildSegments(positions)
  const hovered = segments.find((s) => (s.code || s.name) === hoveredKey) ?? null

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="200" viewBox="0 0 100 100" aria-hidden="true">
        {segments.map((seg, i) => {
          const key = seg.code || `${seg.name}-${i}`
          return (
            <path
              key={key}
              d={seg.d}
              fill={seg.color}
              style={{ opacity: hoveredKey && hoveredKey !== (seg.code || seg.name) ? 0.35 : 1, transition: 'opacity 0.15s' }}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredKey(seg.code || seg.name)}
              onMouseLeave={() => setHoveredKey(null)}
            />
          )
        })}
        <circle cx={CX} cy={CY} r={INNER_R} fill="white" />

        {hovered ? (
          <>
            <text x={CX} y={CY - 7} textAnchor="middle" fontSize="5" fontWeight="bold" fill="#111827">
              {hovered.name}
            </text>
            <text x={CX} y={CY + 1} textAnchor="middle" fontSize="4" fill="#374151">
              {`NT$ ${Math.round(hovered.value).toLocaleString()}`}
            </text>
            <text x={CX} y={CY + 9} textAnchor="middle" fontSize="4" fill="#6b7280">
              {hovered.pct.toFixed(1)}%
            </text>
          </>
        ) : null}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {segments.map((seg, i) => (
          <div key={seg.code || `${seg.name}-${i}`} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: seg.color }} />
            {seg.name} {seg.pct.toFixed(0)}%
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="w-full mt-3">
        {segments.map((seg, i) => (
          <div key={seg.code || `${seg.name}-${i}`} className="flex justify-between text-sm text-gray-700 py-1.5 border-b border-gray-100 last:border-none">
            <span>{seg.name} {seg.code}</span>
            <span className="font-semibold">NT$ {seg.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
