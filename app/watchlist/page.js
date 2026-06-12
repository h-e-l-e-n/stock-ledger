'use client'

import { useState, useEffect } from 'react'

function isPriceNearTarget(current, target) {
  if (current == null || !target) return false
  return Math.abs((current - target) / target) < 0.05
}

function isPriceNearStopLoss(current, stopLoss) {
  if (current == null || !stopLoss) return false
  return Math.abs((current - stopLoss) / stopLoss) < 0.05
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ symbol: '', name: '', targetPrice: '', stopLoss: '' })

  function loadWatchlist() {
    setLoading(true)
    fetch('/api/watchlist')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(async (items) => {
        if (items.length === 0) {
          setWatchlist([])
          return
        }
        const symbols = items.map((i) => i.symbol).join(',')
        let prices = {}
        try {
          const priceRes = await fetch(`/api/prices?symbols=${symbols}`)
          if (priceRes.ok) prices = await priceRes.json()
        } catch {
          // prices stay empty, UI degrades gracefully
        }
        setWatchlist(
          items.map((item) => ({
            ...item,
            currentPrice: prices[item.symbol]?.price ?? null,
            change: prices[item.symbol]?.change ?? null,
            changePercent: prices[item.symbol]?.changePercent ?? null,
          }))
        )
      })
      .catch(() => setWatchlist([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadWatchlist() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newItem.symbol) return
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: newItem.symbol,
        name: newItem.name,
        targetPrice: parseFloat(newItem.targetPrice) || 0,
        stopLoss: parseFloat(newItem.stopLoss) || 0,
      }),
    })
    setNewItem({ symbol: '', name: '', targetPrice: '', stopLoss: '' })
    setShowAddForm(false)
    loadWatchlist()
  }

  return (
    <main className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">觀察清單</h1>
            <p className="text-gray-500 mt-2">追蹤感興趣的股票與設定目標價</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新增股票
          </button>
        </div>
      </div>

      {/* 新增表單 */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">新增觀察股票</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input type="text" placeholder="股票代號" value={newItem.symbol}
              onChange={(e) => setNewItem((p) => ({ ...p, symbol: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="股票名稱" value={newItem.name}
              onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="number" placeholder="目標價" value={newItem.targetPrice}
              onChange={(e) => setNewItem((p) => ({ ...p, targetPrice: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="number" placeholder="停損價" value={newItem.stopLoss}
              onChange={(e) => setNewItem((p) => ({ ...p, stopLoss: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">新增</button>
              <button type="button" onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">取消</button>
            </div>
          </div>
        </form>
      )}

      {/* 觀察清單 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && <div className="py-12 text-center text-gray-400">載入中...</div>}
        {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['股票代號', '股票名稱'].map((h) => (
                  <th key={h} className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
                {['現價', '漲跌', '目標價', '停損價'].map((h) => (
                  <th key={h} className="text-right py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
                {['提示'].map((h) => (
                  <th key={h} className="text-center py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {watchlist.map((item) => {
                const nearTarget = isPriceNearTarget(item.currentPrice, item.targetPrice)
                const nearStopLoss = isPriceNearStopLoss(item.currentPrice, item.stopLoss)

                return (
                  <tr key={item.symbol} className={`hover:bg-gray-50 transition-colors ${nearTarget || nearStopLoss ? 'bg-yellow-50' : ''}`}>
                    <td className="py-4 px-6 font-mono font-semibold text-gray-900">{item.symbol}</td>
                    <td className="py-4 px-6 font-medium text-gray-700">{item.name}</td>
                    <td className="py-4 px-6 text-right font-semibold text-gray-900">
                      {item.currentPrice != null ? `NT$ ${item.currentPrice.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {item.change != null ? (
                        <div className={`flex items-center justify-end gap-1 ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            {item.change >= 0
                              ? <><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></>
                              : <><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/></>
                            }
                          </svg>
                          <span className="font-semibold">
                            {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}
                          </span>
                          <span className="text-sm">
                            ({item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-4 px-6 text-right text-gray-700">NT$ {item.targetPrice.toFixed(2)}</td>
                    <td className="py-4 px-6 text-right text-gray-700">NT$ {item.stopLoss.toFixed(2)}</td>
                    <td className="py-4 px-6 text-center">
                      {nearTarget && (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">接近目標價</span>
                      )}
                      {nearStopLoss && (
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">接近停損價</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {watchlist.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">尚無觀察清單</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* 說明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">提示說明</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 當現價接近目標價或停損價（±5%）時，會自動標示提示</li>
          <li>• 即時報價資料每分鐘更新一次</li>
        </ul>
      </div>
    </main>
  )
}
