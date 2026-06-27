'use client'

import type { Story } from '@/lib/types'
import { STORY_TYPES } from '@/lib/types'

const TYPE_COLORS: Record<string, string> = {
  Origin:      '#9333ea',
  Identity:    '#3b82f6',
  Failure:     '#ef4444',
  Discovery:   '#06b6d4',
  Client:      '#14b8a6',
  Credibility: '#6366f1',
  Vision:      '#f97316',
}

const TYPE_BG: Record<string, string> = {
  Origin:      'bg-purple-50 text-purple-700',
  Identity:    'bg-blue-50 text-blue-700',
  Failure:     'bg-red-50 text-red-700',
  Discovery:   'bg-cyan-50 text-cyan-700',
  Client:      'bg-teal-50 text-teal-700',
  Credibility: 'bg-indigo-50 text-indigo-700',
  Vision:      'bg-orange-50 text-orange-700',
}

type Props = { stories: Story[] }

export default function StoryTypeChart({ stories }: Props) {
  const total = stories.length

  const counts = STORY_TYPES.map((type) => ({
    type,
    count: stories.filter((s) => s.story_type === type).length,
    color: TYPE_COLORS[type],
  }))

  const uncategorized = stories.filter((s) => !s.story_type).length

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No stories yet — add some to see the breakdown.
      </div>
    )
  }

  // Build donut path segments
  const SIZE = 180
  const cx = SIZE / 2
  const cy = SIZE / 2
  const R = 70
  const r = 42

  function polarToXY(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  function arcPath(startAngle: number, endAngle: number, outerR: number, innerR: number) {
    const large = endAngle - startAngle > 180 ? 1 : 0
    const o1 = polarToXY(startAngle, outerR)
    const o2 = polarToXY(endAngle, outerR)
    const i1 = polarToXY(endAngle, innerR)
    const i2 = polarToXY(startAngle, innerR)
    return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y} Z`
  }

  let currentAngle = 0
  const segments = counts.filter(d => d.count > 0).map(({ type, count, color }) => {
    const angle = (count / total) * 360
    const path = arcPath(currentAngle, currentAngle + angle - 0.5, R, r)
    currentAngle += angle
    return { type, count, color, path }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      {/* Donut */}
      <div className="relative shrink-0">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {segments.map((seg) => (
            <path key={seg.type} d={seg.path} fill={seg.color} opacity={0.85} />
          ))}
          <text x={cx} y={cy - 8} textAnchor="middle" className="text-2xl font-bold" style={{ fontSize: 28, fontWeight: 700, fill: '#111827' }}>
            {total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 11, fill: '#9ca3af' }}>
            {total === 1 ? 'story' : 'stories'}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2.5 w-full">
        {counts.map(({ type, count }) => (
          <div key={type} className={`flex items-center justify-between gap-2 ${count === 0 ? 'opacity-40' : ''}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[type] }} />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BG[type]}`}>{type}</span>
            </div>
            <span className="text-sm font-semibold text-gray-700 shrink-0">{count}</span>
          </div>
        ))}
        {uncategorized > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-300" />
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Uncategorized</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">{uncategorized}</span>
          </div>
        )}
      </div>
    </div>
  )
}
