'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  {
    href: '/',
    label: '總覽',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/positions',
    label: '持倉清單',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: '/trades',
    label: '交易記錄',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/performance',
    label: '績效分析',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: '/dividends',
    label: '股利記錄',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
  {
    href: '/watchlist',
    label: '觀察清單',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
  {
    href: '/notes',
    label: '交易筆記',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
  },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <nav className="w-56 min-h-screen bg-gray-900 text-white flex flex-col p-4 gap-1 shrink-0">
      <span className="text-lg font-bold mb-6 px-2">股票記錄系統</span>
      {links.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            pathname === href
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          {icon}
          {label}
        </Link>
      ))}
    </nav>
  )
}
