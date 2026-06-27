export const STORY_TYPES = [
  'Origin',
  'Identity',
  'Failure',
  'Discovery',
  'Client',
  'Credibility',
  'Vision',
] as const

export const USE_CASES = [
  'podcast',
  'sales_call',
  'keynote',
  'webinar',
  'social',
  'email',
] as const

export const STORY_STATUSES = ['raw', 'revised', 'ready_for_deploy'] as const

export const CLIENT_STATUSES = ['active', 'paused', 'archived'] as const

export type StoryType = typeof STORY_TYPES[number]
export type UseCase = typeof USE_CASES[number]
export type StoryStatus = typeof STORY_STATUSES[number]
export type ClientStatus = typeof CLIENT_STATUSES[number]

export type Client = {
  id: string
  name: string
  email: string | null
  company_name: string | null
  main_framework: string | null
  brand_voice: string | null
  status: ClientStatus
  notes: string | null
  created_at: string
}

export type StoryVault = {
  id: string
  client_id: string
  title: string
  status: string
  created_at: string
}

export type Story = {
  id: string
  vault_id: string
  title: string
  story_type: StoryType | null
  transcription: string | null
  short_version: string | null
  long_version: string | null
  one_liner: string | null
  quotes: string | null
  use_cases: UseCase[]
  clarity_score: number | null
  emotional_impact_score: number | null
  status: StoryStatus
  metadata: Record<string, unknown>
  created_at: string
}

export type Tag = {
  id: string
  name: string
}
