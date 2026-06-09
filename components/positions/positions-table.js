'use client'

import { useState } from 'react'

export function sortRows(rows, sortKey, sortDir) {
  if (!sortKey) return rows
  return [...rows].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? av - bv : bv - av
  })
}

const COLUMNS = [
  { key: 'code',         label: '股票代號', align: 'left'  },
  { key: 'name',         label: '股票名稱', align: 'left'  },
  { key: 'shares',       label: '持有股數', align: 'right' },
  { key: 'costPrice',    label: '成本價',   align: 'right' },
  { key: 'currentPrice', label: '現價',     align: 'right' },
  { key: 'pnlAmount',    label: '損益金額', align: 'right' },
  { key: 'pnlPct',       label: '損益%',    align: 'right' },
]

function pnlColor(v) {
  return v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-900'
}

export default function PositionsTable({ positions = [] }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const rows = sortRows(
    positions.map((p) => ({
      ...p,
      pnlAmount: (p.currentPrice - p.costPrice) * p.shares,
      pnlPct: p.costPrice !== 0
        ? (p.currentPrice - p.costPrice) / p.costPrice * 100
        : 0,
    })),
    sortKey,
    sortDir,
  )

  function handleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`px-4 py-3 text-xs font-medium cursor-pointer select-none hover:text-gray-700 ${col.align === 'right' ? 'text-right' : 'text-left'} ${sortKey === col.key ? 'text-gray-700' : 'text-gray-400'}`}
              >
                {col.label}{' '}
                {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.code}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{row.name}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-700">{row.shares.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-700">NT$ {row.costPrice.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-700">NT$ {row.currentPrice.toLocaleString()}</td>
              <td className={`px-4 py-3 text-sm text-right font-medium ${pnlColor(row.pnlAmount)}`}>
                NT$ {row.pnlAmount > 0 ? '+' : row.pnlAmount < 0 ? '-' : ''}{Math.abs(row.pnlAmount).toLocaleString()}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-medium ${pnlColor(row.pnlPct)}`}>
                {row.pnlPct > 0 ? '+' : row.pnlPct < 0 ? '-' : ''}{Math.abs(row.pnlPct).toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
