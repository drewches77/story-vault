'use client'

import type { Story, Project, GeneratedAsset } from '@/lib/types'
import { STORY_TYPES } from '@/lib/types'

const TYPE_DESCRIPTIONS: Record<string, string> = {
  Origin:      'Where you started and why',
  Identity:    'Who you are and what you stand for',
  Failure:     'A setback that led to growth',
  Discovery:   'A breakthrough insight or lesson',
  Client:      'A client transformation or result',
  Credibility: 'Proof of expertise and authority',
  Vision:      'Where you\'re going and why it matters',
}

type Props = {
  stories: Story[]
  projects: Project[]
  latestStrategy: GeneratedAsset | null
  avgUtilityScore: number | null
}

function Card({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'green' | 'amber' | 'red' | 'indigo' | 'gray'
}) {
  const accentClass = {
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    gray: 'bg-gray-100 text-gray-500',
  }[accent ?? 'gray']

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-lg font-semibold ${accent ? accentClass.split(' ')[1] : 'text-gray-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function DashboardCards({ stories, projects, latestStrategy, avgUtilityScore }: Props) {
  const totalStories = stories.length
  const activeProjects = projects.filter((p) => p.status !== 'archived').length

  // Biggest gap: story type with 0 stories
  const typeCounts = STORY_TYPES.map((t) => ({
    type: t,
    count: stories.filter((s) => s.story_type === t).length,
  }))
  const missingTypes = typeCounts.filter((t) => t.count === 0)
  const biggestGap = missingTypes.length > 0
    ? missingTypes[0].type
    : typeCounts.sort((a, b) => a.count - b.count)[0]?.type ?? '—'

  // Strategy status
  const strategyLabel = latestStrategy
    ? latestStrategy.status === 'approved' ? 'Approved'
    : latestStrategy.status === 'reviewed' ? 'In Review'
    : 'Draft'
    : 'Not Generated'
  const strategyAccent = latestStrategy
    ? latestStrategy.status === 'approved' ? 'green'
    : 'amber'
    : 'gray'

  // Best opportunity: project type with most stories supporting it
  const hasTalk = stories.some((s) => s.use_cases?.includes('keynote'))
  const hasWebinar = stories.some((s) => s.use_cases?.includes('webinar'))
  const bestOpportunity = hasTalk ? 'Talk build' : hasWebinar ? 'Webinar build' : totalStories >= 5 ? 'Social strategy' : 'Add more stories'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
      <Card
        label="Total Stories"
        value={String(totalStories)}
        sub={`${typeCounts.filter(t => t.count > 0).length} of ${STORY_TYPES.length} types covered`}
        accent={totalStories >= 10 ? 'green' : totalStories >= 5 ? 'amber' : 'gray'}
      />
      <Card
        label="Avg Utility Score"
        value={avgUtilityScore ? `${avgUtilityScore.toFixed(1)} / 5` : 'No scores yet'}
        sub={avgUtilityScore ? 'Across scored stories' : 'Score stories to see this'}
        accent={avgUtilityScore ? avgUtilityScore >= 4 ? 'green' : avgUtilityScore >= 3 ? 'amber' : 'red' : 'gray'}
      />
      <Card
        label="Social Strategy"
        value={strategyLabel}
        sub={latestStrategy ? `Updated ${new Date(latestStrategy.updated_at).toLocaleDateString()}` : 'Coming soon — AI paused'}
        accent="gray"
      />
      <Card
        label="Active Projects"
        value={String(activeProjects)}
        sub={activeProjects === 0 ? 'Create one from Projects tab' : `${activeProjects} in progress`}
        accent={activeProjects > 0 ? 'indigo' : 'gray'}
      />
      <Card
        label="Biggest Gap"
        value={biggestGap}
        sub={TYPE_DESCRIPTIONS[biggestGap] ?? (missingTypes.length > 0 ? 'Missing story type' : 'Least covered type')}
        accent="amber"
      />
      <Card
        label="Best Opportunity"
        value={bestOpportunity}
        sub="Based on current inventory"
        accent="indigo"
      />
    </div>
  )
}
