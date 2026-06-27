'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Overview', href: '' },
  { label: 'Stories', href: '' },
  { label: 'Frameworks', href: '/frameworks' },
  { label: 'Offers', href: '/offers' },
]

type Props = {
  clientId: string
  activeStoriesTab?: 'overview' | 'stories'
  onTabChange?: (tab: 'overview' | 'stories') => void
}

export default function ClientTabNav({ clientId, activeStoriesTab = 'overview', onTabChange }: Props) {
  const pathname = usePathname()
  const base = `/clients/${clientId}`

  function isActive(tabHref: string, label: string) {
    if (label === 'Frameworks') return pathname === `${base}/frameworks`
    if (label === 'Offers') return pathname === `${base}/offers`
    if (label === 'Overview') return pathname === base && activeStoriesTab === 'overview'
    if (label === 'Stories') return pathname === base && activeStoriesTab === 'stories'
    return false
  }

  return (
    <div className="flex gap-1 mb-6 border-b border-gray-200">
      {TABS.map(({ label, href }) => {
        const active = isActive(href, label)
        const isStateTab = label === 'Overview' || label === 'Stories'

        if (isStateTab) {
          return (
            <button
              key={label}
              onClick={() => onTabChange?.(label.toLowerCase() as 'overview' | 'stories')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                active
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          )
        }

        return (
          <Link
            key={label}
            href={`${base}${href}`}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
