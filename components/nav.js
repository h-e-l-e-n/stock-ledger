'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',             label: 'Dashboard' },
  { href: '/positions',    label: '持倉清單' },
  { href: '/trades',       label: '交易記錄' },
  { href: '/performance',  label: '績效分析' },
  { href: '/dividends',    label: '股利記錄' },
  { href: '/watchlist',    label: '觀察清單' },
  { href: '/notes',        label: '交易筆記' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <nav className="w-48 min-h-screen bg-gray-900 text-white flex flex-col p-4 gap-1 shrink-0">
      <span className="text-lg font-bold mb-6 px-2">Stock Ledger</span>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-3 py-2 rounded text-sm transition-colors ${
            pathname === href
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
