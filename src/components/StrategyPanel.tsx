'use client'

import type { GeneratedAsset } from '@/lib/types'

type Props = {
  clientId: string
  latestStrategy: GeneratedAsset | null
  onGenerated?: () => void
}

export default function StrategyPanel({ clientId, latestStrategy }: Props) {
  const content = latestStrategy?.content as any

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Social Strategy</h2>
          <p className="text-xs text-gray-400 mt-0.5">AI-generated positioning and content direction</p>
        </div>
        <button
          disabled
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-400 cursor-not-allowed font-medium"
          title="AI coming soon"
        >
          {latestStrategy ? 'Regenerate' : 'Generate Strategy'}
        </button>
      </div>

      <div className="px-5 py-5">
        {latestStrategy && content ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                latestStrategy.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                latestStrategy.status === 'reviewed' ? 'bg-amber-50 text-amber-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {latestStrategy.status}
              </span>
              <span className="text-xs text-gray-400">
                Last updated {new Date(latestStrategy.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {content.positioning_summary && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Positioning</p>
                <p className="text-sm text-gray-700">{content.positioning_summary}</p>
              </div>
            )}
            {content.content_pillars?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Content Pillars</p>
                <div className="flex flex-wrap gap-2">
                  {content.content_pillars.map((p: any, i: number) => (
                    <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No strategy generated yet</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              AI strategy generation coming soon. Add stories, frameworks, and offers first to get the best results.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
