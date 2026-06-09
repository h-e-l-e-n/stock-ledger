'use client'

import { useState } from 'react'

const mockWatchlist = [
  { symbol: '2303', name: '聯電',   currentPrice: 48.5, targetPrice: 55,  stopLoss: 42,  change: 1.2,  changePercent: 2.54,  alertEnabled: true  },
  { symbol: '2379', name: '瑞昱',   currentPrice: 385,  targetPrice: 420, stopLoss: 350, change: -5.5, changePercent: -1.41, alertEnabled: true  },
  { symbol: '2408', name: '南亞科', currentPrice: 72.3, targetPrice: 80,  stopLoss: 65,  change: 2.8,  changePercent: 4.03,  alertEnabled: false },
  { symbol: '2603', name: '長榮',   currentPrice: 165,  targetPrice: 180, stopLoss: 150, change: -3.2, changePercent: -1.90, alertEnabled: true  },
]

function isPriceNearTarget(current, target) {
  return Math.abs((current - target) / target) < 0.05
}

function isPriceNearStopLoss(current, stopLoss) {
  return Math.abs((current - stopLoss) / stopLoss) < 0.05
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState(mockWatchlist)
  const [showAddForm, setShowAddForm] = useState(false)

  const toggleAlert = (symbol) => {
    setWatchlist(watchlist.map((item) =>
      item.symbol === symbol ? { ...item, alertEnabled: !item.alertEnabled } : item
    ))
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
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">新增觀察股票</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input type="text" placeholder="股票代號"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="number" placeholder="目標價"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="number" placeholder="停損價"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
              新增
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 觀察清單 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                {['提示', '通知'].map((h) => (
                  <th key={h} className="text-center py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {watchlist.map((item) => {
                const nearTarget = isPriceNearTarget(item.currentPrice, item.targetPrice)
                const nearStopLoss = isPriceNearStopLoss(item.currentPrice, item.stopLoss)
                const up = item.change >= 0

                return (
                  <tr key={item.symbol} className={`hover:bg-gray-50 transition-colors ${nearTarget || nearStopLoss ? 'bg-yellow-50' : ''}`}>
                    <td className="py-4 px-6 font-mono font-semibold text-gray-900">{item.symbol}</td>
                    <td className="py-4 px-6 font-medium text-gray-700">{item.name}</td>
                    <td className="py-4 px-6 text-right font-semibold text-gray-900">NT$ {item.currentPrice.toFixed(2)}</td>
                    <td className="py-4 px-6 text-right">
                      <div className={`flex items-center justify-end gap-1 ${up ? 'text-green-600' : 'text-red-600'}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          {up
                            ? <><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></>
                            : <><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/></>
                          }
                        </svg>
                        <span className="font-semibold">{up ? '+' : ''}{item.change.toFixed(2)}</span>
                        <span className="text-sm">({up ? '+' : ''}{item.changePercent.toFixed(2)}%)</span>
                      </div>
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
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => toggleAlert(item.symbol)}
                        className={`p-2 rounded-lg transition-colors ${item.alertEnabled ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                      >
                        {item.alertEnabled ? (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 01-3.46 0"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M13.73 21a2 2 0 01-3.46 0"/>
                            <path d="M18.63 13A17.89 17.89 0 0118 8"/>
                            <path d="M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14"/>
                            <path d="M18 8a6 6 0 00-9.33-5"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 說明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">提示說明</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 當現價接近目標價或停損價（±5%）時，會自動標示提示</li>
          <li>• 開啟通知後，達到目標價或停損價時會收到提醒</li>
          <li>• 即時報價資料每分鐘更新一次</li>
        </ul>
      </div>
    </main>
  )
}
