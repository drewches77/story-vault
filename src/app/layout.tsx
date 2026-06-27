export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Story Vault',
  description: 'Client story vault management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex bg-white text-gray-900">
        <Sidebar />
        <div className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  )
}
