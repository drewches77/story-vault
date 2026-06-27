'use client'

import { useState } from 'react'
import type { GeneratedAsset } from '@/lib/types'

type Props = {
  clientId: string
  latestStrategy: GeneratedAsset | null
  onGenerated?: () => void
}

export default function StrategyPanel({ clientId, latestStrategy, onGenerated }: Props) {
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-social-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unknown error')
      onGenerated?.()
    } catch (err) {
      alert(`Error generating strategy: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGenerating(false)
    }
  }

  const content = latestStrategy?.content as any

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Social Strategy</h2>
          <p className="text-xs text-gray-400 mt-0.5">AI-generated positioning and content direction</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {generating ? (
            <>
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            latestStrategy ? 'Regenerate' : 'Generate Strategy'
          )}
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

            {/* Expandable detail */}
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {expanded ? '▲ Hide details' : '▼ Show full strategy'}
            </button>

            {expanded && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                {content.platform_strategy && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Platform Strategy</p>
                    <div className="space-y-2">
                      {Object.entries(content.platform_strategy).map(([platform, strategy]: [string, any]) => (
                        <div key={platform}>
                          <p className="text-xs font-semibold text-gray-700 capitalize mb-0.5">{platform}</p>
                          <p className="text-xs text-gray-600">{strategy}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {content.story_recommendations?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Story Recommendations</p>
                    <div className="space-y-3">
                      {content.story_recommendations.map((r: any, i: number) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-800 mb-0.5">{r.story_title}</p>
                          <p className="text-xs text-gray-600 mb-1">{r.recommended_use}</p>
                          {r.suggested_hook && (
                            <p className="text-xs italic text-indigo-700">&ldquo;{r.suggested_hook}&rdquo;</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {content.content_gaps?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Content Gaps</p>
                    <ul className="space-y-1">
                      {content.content_gaps.map((gap: string, i: number) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                          <span className="text-amber-400 mt-0.5">•</span>{gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
              Add stories, frameworks, and offers first, then click Generate Strategy for AI-powered positioning.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
