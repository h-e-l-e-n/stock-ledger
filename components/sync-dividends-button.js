'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SyncDividendsButton() {
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [added, setAdded] = useState(0)
  const router = useRouter()

  async function handleSync() {
    setState('loading')
    try {
      const res = await fetch('/api/dividends/sync', { method: 'POST' })
      if (!res.ok) throw new Error(res.statusText)
      const json = await res.json()
      setAdded(json.added ?? 0)
      setState('done')
      router.refresh()
    } catch {
      setState('error')
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={state === 'loading'}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
    >
      <svg
        className={`w-4 h-4 ${state === 'loading' ? 'animate-spin' : ''}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        aria-hidden="true"
      >
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      {state === 'loading' && '同步中...'}
      {state === 'done' && (added > 0 ? `已新增 ${added} 筆` : '已是最新')}
      {state === 'error' && '同步失敗，請重試'}
      {state === 'idle' && '同步股利'}
    </button>
  )
}
