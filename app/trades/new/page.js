'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewTradePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    type: '買入',
    fundSource: '定期定額',
    symbol: '',
    name: '',
    shares: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    fee: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const shares = parseFloat(formData.shares) || 0
    const price = parseFloat(formData.price) || 0
    const fee = parseFloat(formData.fee) || 0
    const amount = shares * price * 1000

    await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: formData.date,
        type: formData.type,
        fundSource: formData.fundSource,
        symbol: formData.symbol,
        name: formData.name,
        shares,
        price,
        amount,
        fee,
      }),
    })
    router.push('/trades')
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const calculateTotal = () => {
    const shares = parseFloat(formData.shares) || 0
    const price = parseFloat(formData.price) || 0
    const fee = parseFloat(formData.fee) || 0
    const total = shares * price * 1000
    return formData.type === '買入' ? total + fee : total - fee
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <button
          onClick={() => router.push('/trades')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          返回交易記錄
        </button>
        <h1 className="text-2xl font-bold">新增交易</h1>
        <p className="text-gray-500 mt-2">記錄買賣交易明細</p>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 交易類型 */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              交易類型 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {['買入', '賣出'].map((t) => (
                <label key={t} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={formData.type === t}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 font-medium">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 資金來源 */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              資金來源 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {['定期定額', '貸款資金', '閒錢操作'].map((src) => (
                <label key={src} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="fundSource"
                    value={src}
                    checked={formData.fundSource === src}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 font-medium">{src}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 交易資訊 */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">交易資訊</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  股票代號 <span className="text-red-500">*</span>
                </label>
                <input type="text" name="symbol" value={formData.symbol} onChange={handleChange}
                  placeholder="例如: 2330" required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">股票名稱</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange}
                  placeholder="例如: 台積電"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  股數 (張) <span className="text-red-500">*</span>
                </label>
                <input type="number" name="shares" value={formData.shares} onChange={handleChange}
                  placeholder="例如: 10" required min="0" step="0.001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  價格 (元) <span className="text-red-500">*</span>
                </label>
                <input type="number" name="price" value={formData.price} onChange={handleChange}
                  placeholder="例如: 580" required min="0" step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  交易日期 <span className="text-red-500">*</span>
                </label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">手續費 (元)</label>
                <input type="number" name="fee" value={formData.fee} onChange={handleChange}
                  placeholder="例如: 29" min="0" step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {formData.shares && formData.price && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">預估總金額</span>
                  <span className="text-xl font-bold text-blue-900">
                    NT$ {calculateTotal().toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 提交按鈕 */}
          <div className="flex gap-4">
            <button type="submit"
              className="flex items-center justify-center gap-2 flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              確認新增
            </button>
            <button type="button" onClick={() => router.push('/trades')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
