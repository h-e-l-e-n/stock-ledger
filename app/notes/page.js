'use client'

import { useState, useEffect } from 'react'

function getStrategyColor(strategy) {
  switch (strategy) {
    case '短線': return 'bg-orange-100 text-orange-700'
    case '波段': return 'bg-purple-100 text-purple-700'
    case '長期': return 'bg-blue-100 text-blue-700'
    default:     return 'bg-gray-100 text-gray-700'
  }
}

const EMPTY_FORM = { symbol: '', name: '', strategy: '長期', buyReason: '', sellReason: '', expectedResult: '', status: '持有中' }

export default function NotesPage() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStrategy, setFilterStrategy] = useState('全部')
  const [filterStatus, setFilterStatus] = useState('全部')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function loadNotes() {
    setLoading(true)
    fetch('/api/notes')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadNotes() }, [])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!form.symbol || !form.buyReason) return
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        ...form,
      }),
    })
    setForm(EMPTY_FORM)
    setShowAddForm(false)
    loadNotes()
  }

  const filteredNotes = notes.filter((note) => {
    const matchesStrategy = filterStrategy === '全部' || note.strategy === filterStrategy
    const matchesStatus = filterStatus === '全部' || note.status === filterStatus
    const matchesSearch = searchTerm === '' || note.symbol.includes(searchTerm) || note.name.includes(searchTerm)
    return matchesStrategy && matchesStatus && matchesSearch
  })

  return (
    <main className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">交易筆記</h1>
            <p className="text-gray-500 mt-2">記錄投資決策與事後檢討</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新增筆記
          </button>
        </div>
      </div>

      {/* 新增筆記表單 */}
      {showAddForm && (
        <form onSubmit={handleAddNote} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">新增交易筆記</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">股票代號 <span className="text-red-500">*</span></label>
              <input type="text" name="symbol" value={form.symbol} onChange={handleFormChange}
                placeholder="例如: 2330" required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">股票名稱</label>
              <input type="text" name="name" value={form.name} onChange={handleFormChange}
                placeholder="例如: 台積電"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">投資策略</label>
              <select name="strategy" value={form.strategy} onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['短線', '波段', '長期'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">買入理由 <span className="text-red-500">*</span></label>
              <textarea name="buyReason" value={form.buyReason} onChange={handleFormChange}
                rows={3} required placeholder="記錄這次買入的理由與邏輯..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">賣出理由</label>
              <textarea name="sellReason" value={form.sellReason} onChange={handleFormChange}
                rows={3} placeholder="記錄賣出的理由（選填）..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">預期結果</label>
            <input type="text" name="expectedResult" value={form.expectedResult} onChange={handleFormChange}
              placeholder="例如: 目標價650元,預期持有3-6個月"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
            <div className="flex gap-4 mt-2">
              {['持有中', '已結束'].map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="status" value={s} checked={form.status === s} onChange={handleFormChange}
                    className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
              新增
            </button>
            <button type="button" onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM) }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">
              取消
            </button>
          </div>
        </form>
      )}

      {/* 篩選工具列 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
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

          <div className="flex gap-2">
            {['全部', '短線', '波段', '長期'].map((strategy) => (
              <button key={strategy} onClick={() => setFilterStrategy(strategy)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStrategy === strategy ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {strategy}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {['全部', '持有中', '已結束'].map((status) => (
              <button key={status} onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === status ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 筆記卡片列表 */}
      {loading && <div className="py-12 text-center text-gray-400">載入中...</div>}
      <div className="grid grid-cols-1 gap-6">
        {filteredNotes.map((note) => (
          <div key={note.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900">{note.symbol} {note.name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStrategyColor(note.strategy)}`}>{note.strategy}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${note.status === '持有中' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {note.status}
                </span>
              </div>
              <span className="text-sm text-gray-500">{note.date}</span>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                  </svg>
                  <h4 className="font-semibold text-green-900">買入理由</h4>
                </div>
                <p className="text-green-800">{note.buyReason}</p>
              </div>

              {note.sellReason && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
                    </svg>
                    <h4 className="font-semibold text-red-900">賣出理由</h4>
                  </div>
                  <p className="text-red-800">{note.sellReason}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">預期結果</h4>
                  <p className="text-blue-800">{note.expectedResult}</p>
                </div>
                {note.actualResult && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2">實際結果</h4>
                    <p className="text-purple-800">{note.actualResult}</p>
                  </div>
                )}
              </div>

              {note.review && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-2">事後檢討</h4>
                  <p className="text-amber-800">{note.review}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12 text-gray-500">沒有符合條件的交易筆記</div>
      )}
    </main>
  )
}
