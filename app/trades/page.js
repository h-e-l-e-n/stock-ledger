'use client'

import { useState } from 'react'
import Link from 'next/link'

const mockTrades = [
  { id: 1, date: '2026-06-05', type: '買入', fundSource: '定期定額', symbol: '2330', name: '台積電', shares: 10, price: 580,  amount: 5800, fee: 29 },
  { id: 2, date: '2026-06-03', type: '賣出', fundSource: '閒錢操作', symbol: '2454', name: '聯發科', shares: 5,  price: 1120, amount: 5600, fee: 84 },
  { id: 3, date: '2026-06-01', type: '買入', fundSource: '貸款資金', symbol: '2317', name: '鴻海',   shares: 20, price: 105,  amount: 2100, fee: 11 },
  { id: 4, date: '2026-05-28', type: '買入', fundSource: '定期定額', symbol: '2882', name: '國泰金', shares: 50, price: 42,   amount: 2100, fee: 11 },
  { id: 5, date: '2026-05-25', type: '賣出', fundSource: '閒錢操作', symbol: '2412', name: '中華電', shares: 30, price: 118,  amount: 3540, fee: 53 },
  { id: 6, date: '2026-05-20', type: '買入', fundSource: '定期定額', symbol: '2330', name: '台積電', shares: 15, price: 520,  amount: 7800, fee: 39 },
]

const FUND_SOURCE_COLOR = {
  '定期定額': 'bg-blue-100 text-blue-700',
  '貸款資金': 'bg-purple-100 text-purple-700',
  '閒錢操作': 'bg-emerald-100 text-emerald-700',
}

export default function TradesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('全部')
  const [filterFund, setFilterFund] = useState('全部')

  const filteredTrades = mockTrades.filter((trade) => {
    const matchesSearch = searchTerm === '' || trade.symbol.includes(searchTerm) || trade.name.includes(searchTerm)
    const matchesType = filterType === '全部' || trade.type === filterType
    const matchesFund = filterFund === '全部' || trade.fundSource === filterFund
    return matchesSearch && matchesType && matchesFund
  })

  const handleExportCSV = () => {
    const headers = ['日期', '類型', '資金來源', '股票代號', '股票名稱', '股數', '價格', '金額', '手續費']
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
                {['日期', '類型', '資金來源', '股票代號', '股票名稱'].map((h) => (
                  <th key={h} className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
                {['股數', '價格', '金額', '手續費'].map((h) => (
                  <th key={h} className="text-right py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTrades.length === 0 && (
          <div className="py-12 text-center text-gray-500">沒有符合條件的交易記錄</div>
        )}
      </div>
    </div>
  )
}
