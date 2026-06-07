import './globals.css'
import Nav from '@/components/nav'

export const metadata = {
  title: 'Stock Ledger',
  description: '個人股票帳本',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className="flex bg-gray-50 min-h-screen">
        <Nav />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </body>
    </html>
  )
}
