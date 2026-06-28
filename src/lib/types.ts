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

export const FRAMEWORK_TYPES = [
  'authority', 'client_ip', 'talk_framework', 'webinar_framework',
  'sales_framework', 'content_framework', 'offer_framework', 'other',
] as const

export const FRAMEWORK_STATUSES = ['draft', 'reviewed', 'approved', 'archived'] as const

export const PROJECT_CATEGORIES = ['talk', 'social_media'] as const
export const TALK_TYPES = ['keynote', 'webinar', 'sales_presentation', 'workshop'] as const
export const SOCIAL_MEDIA_TYPES = ['weekly', 'email_campaign', 'launch_campaign'] as const
export const PROJECT_TYPES = [...TALK_TYPES, ...SOCIAL_MEDIA_TYPES] as const
export const PROJECT_STATUSES = ['draft', 'in_progress', 'ready_for_review', 'approved', 'archived'] as const

export const SECTION_ROLES = [
  'Opening Hook',
  'Problem / Agitation',
  'Framework Proof',
  'Client Result',
  'Objection Handler',
  'Closing Story',
  'CTA Story',
] as const

export const STORY_ROLES = [
  'opening_story', 'origin_story', 'credibility_story', 'failure_story',
  'teaching_story', 'proof_story', 'objection_story', 'transition_story',
  'closing_story', 'cta_story', 'email_story', 'social_story',
] as const

export const ASSET_TYPES = [
  'social_strategy', 'talk_outline', 'webinar_outline',
  'sales_presentation_outline', 'email_campaign_plan',
  'story_analysis', 'readiness_report', 'content_ideas',
  'cta_map', 'project_recommendations',
] as const

export const OFFER_STATUSES = ['active', 'draft', 'archived'] as const

export type StoryType = typeof STORY_TYPES[number]
export type UseCase = typeof USE_CASES[number]
export type StoryStatus = typeof STORY_STATUSES[number]
export type ClientStatus = typeof CLIENT_STATUSES[number]
export type FrameworkType = typeof FRAMEWORK_TYPES[number]
export type FrameworkStatus = typeof FRAMEWORK_STATUSES[number]
export type ProjectCategory = typeof PROJECT_CATEGORIES[number]
export type TalkType = typeof TALK_TYPES[number]
export type SocialMediaType = typeof SOCIAL_MEDIA_TYPES[number]
export type ProjectType = typeof PROJECT_TYPES[number]
export type ProjectStatus = typeof PROJECT_STATUSES[number]
export type SectionRole = typeof SECTION_ROLES[number]
export type StoryRole = typeof STORY_ROLES[number]
export type AssetType = typeof ASSET_TYPES[number]
export type OfferStatus = typeof OFFER_STATUSES[number]

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

export type StoryScore = {
  id: string
  story_id: string
  clarity_score: number | null
  emotional_impact_score: number | null
  teaching_value_score: number | null
  authority_value_score: number | null
  sales_value_score: number | null
  relatability_score: number | null
  reusability_score: number | null
  overall_utility_score: number | null
  analysis_notes: string | null
  created_at: string
  updated_at: string
}

export type Framework = {
  id: string
  client_id: string
  name: string
  description: string | null
  framework_type: FrameworkType | null
  steps: Record<string, unknown>[] | null
  best_use_cases: string[] | null
  related_topics: string[] | null
  visual_metaphor: string | null
  status: FrameworkStatus
  created_at: string
  updated_at: string
}

export type Offer = {
  id: string
  client_id: string
  name: string
  description: string | null
  price: string | null
  audience: string | null
  problem_solved: string | null
  promise: string | null
  cta: string | null
  status: OfferStatus
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  client_id: string
  vault_id: string | null
  category: string
  project_type: string
  title: string
  status: ProjectStatus
  audience: string | null
  goal: string | null
  cta: string | null
  offer_id: string | null
  primary_framework_id: string | null
  length_minutes: number | null
  tone: string | null
  one_big_idea: string | null
  setup_data: Record<string, unknown> | null
  readiness_score: number | null
  readiness_notes: string | null
  created_at: string
  updated_at: string
}

export type TalkSection = {
  id: string
  project_id: string
  title: string
  notes: string | null
  script: string | null
  position: number
  story_id: string | null
  story_role: string | null
  created_at: string
  updated_at: string
}

export type GeneratedAsset = {
  id: string
  client_id: string
  vault_id: string | null
  project_id: string | null
  asset_type: AssetType
  title: string | null
  content: Record<string, unknown>
  plain_text: string | null
  input_snapshot: Record<string, unknown> | null
  model_used: string | null
  prompt_version: string | null
  status: string
  created_at: string
  updated_at: string
}

export type GeneratedAssetVersion = {
  id: string
  generated_asset_id: string
  version_number: number
  content: Record<string, unknown>
  plain_text: string | null
  change_note: string | null
  created_at: string
}
