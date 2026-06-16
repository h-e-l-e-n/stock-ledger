'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { aggregateTrades } from '@/lib/positions'

function computeSellPnls(trades) {
  const pnls = new Map()
  for (const sell of trades.filter((t) => t.type === '賣出')) {
    const prior = trades.filter((t) => t !== sell && t.date <= sell.date)
    const positions = aggregateTrades(prior)
    const pos = positions.find((p) => p.code === sell.symbol && p.fundSource === sell.fundSource)
    if (!pos) continue
    pnls.set(sell.id, Math.round((sell.amount - sell.fee) - pos.costPrice * sell.shares))
  }
  return pnls
}

const FUND_SOURCE_COLOR = {
  '定期定額': 'bg-blue-100 text-blue-700',
  '貸款資金': 'bg-purple-100 text-purple-700',
  '閒錢操作': 'bg-emerald-100 text-emerald-700',
}

export default function TradesPage() {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('全部')
  const [filterFund, setFilterFund] = useState('全部')
  const [sortOrder, setSortOrder] = useState('desc')

  const sellPnls = useMemo(() => computeSellPnls(trades), [trades])

  useEffect(() => {
    fetch('/api/trades')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setTrades)
      .catch(() => setTrades([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredTrades = trades
    .filter((trade) => {
      const matchesSearch = searchTerm === '' || trade.symbol.includes(searchTerm) || trade.name.includes(searchTerm)
      const matchesType = filterType === '全部' || trade.type === filterType
      const matchesFund = filterFund === '全部' || trade.fundSource === filterFund
      return matchesSearch && matchesType && matchesFund
    })
    .sort((a, b) => sortOrder === 'desc'
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date)
    )

  const handleExportCSV = () => {
    const headers = ['日期', '類型', '資金來源', '股票代號', '股票名稱', '張數', '價格', '金額', '手續費']
    const rows = filteredTrades.map((t) => [t.date, t.type, t.fundSource, t.symbol, t.name, t.shares, t.price, t.amount, t.fee])
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `交易記錄_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">交易記錄</h1>
        <p className="text-gray-500 mt-2">所有買賣明細與歷史記錄</p>
      </div>

      {/* 工具列 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
            {/* 搜尋 */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="搜尋股票代號或名稱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 買賣篩選 */}
            <div className="flex gap-2">
              {['全部', '買入', '賣出'].map((type) => (
                <button key={type} onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 動作按鈕 */}
          <div className="flex gap-3">
            <button onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              匯出 CSV
            </button>
            <Link href="/trades/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              新增交易
            </Link>
          </div>
        </div>

        {/* 資金來源篩選 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 shrink-0">資金來源</span>
          <div className="flex gap-2 flex-wrap">
            {['全部', '定期定額', '貸款資金', '閒錢操作'].map((fund) => (
              <button key={fund} onClick={() => setFilterFund(fund)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterFund === fund
                    ? fund === '全部' ? 'bg-gray-700 text-white'
                      : fund === '定期定額' ? 'bg-blue-600 text-white'
                      : fund === '貸款資金' ? 'bg-purple-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {fund}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 交易列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  <button
                    onClick={() => setSortOrder((o) => o === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    日期
                    <span className="text-gray-400">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  </button>
                </th>
                {['類型', '資金來源', '股票代號', '股票名稱'].map((h) => (
                  <th key={h} className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
                {['張數', '價格', '金額', '手續費'].map((h) => (
                  <th key={h} className="text-right py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">損益</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 text-gray-700">{trade.date}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${trade.type === '買入' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${FUND_SOURCE_COLOR[trade.fundSource]}`}>
                      {trade.fundSource}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono font-semibold text-gray-900">{trade.symbol}</td>
                  <td className="py-4 px-6 font-medium text-gray-700">{trade.name}</td>
                  <td className="py-4 px-6 text-right text-gray-700">{trade.shares.toLocaleString('en-US')}</td>
                  <td className="py-4 px-6 text-right text-gray-700">NT$ {trade.price.toLocaleString('en-US')}</td>
                  <td className="py-4 px-6 text-right font-semibold text-gray-900">NT$ {trade.amount.toLocaleString('en-US')}</td>
                  <td className="py-4 px-6 text-right text-gray-600">NT$ {trade.fee}</td>
                  <td className="py-4 px-6 text-right">
                    {trade.type === '賣出' && sellPnls.has(trade.id) ? (() => {
                      const pnl = sellPnls.get(trade.id)
                      const sign = pnl >= 0 ? '+' : ''
                      return (
                        <span className={pnl > 0 ? 'text-green-600 font-semibold' : pnl < 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                          {sign}NT$ {Math.abs(pnl).toLocaleString('en-US')}
                        </span>
                      )
                    })() : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="py-12 text-center text-gray-400">載入中...</div>
        )}
        {!loading && filteredTrades.length === 0 && (
          <div className="py-12 text-center text-gray-500">沒有符合條件的交易記錄</div>
        )}
      </div>
    </div>
  )
}
