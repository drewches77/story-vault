'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { exportStoriesToDocx } from '@/lib/export'
import type { Client, StoryVault, Story, Tag, Project, GeneratedAsset, StoryScore } from '@/lib/types'
import { STORY_TYPES, USE_CASES, STORY_STATUSES } from '@/lib/types'
import DropdownMenu from '@/components/DropdownMenu'
import ImportModal from '@/components/ImportModal'
import StoryTypeChart from '@/components/StoryTypeChart'
import DashboardCards from '@/components/DashboardCards'
import StrategyPanel from '@/components/StrategyPanel'
import ProjectsPanel from '@/components/ProjectsPanel'
import ClientTabNav from '@/components/ClientTabNav'

type StoryWithTags = Story & { tags: Tag[] }

const STATUS_STYLES: Record<string, string> = {
  raw: 'bg-gray-100 text-gray-600',
  revised: 'bg-amber-50 text-amber-700',
  ready_for_deploy: 'bg-emerald-50 text-emerald-700',
}

const TYPE_STYLES: Record<string, string> = {
  Origin: 'bg-purple-50 text-purple-700',
  Identity: 'bg-blue-50 text-blue-700',
  Failure: 'bg-red-50 text-red-700',
  Discovery: 'bg-cyan-50 text-cyan-700',
  Client: 'bg-teal-50 text-teal-700',
  Credibility: 'bg-indigo-50 text-indigo-700',
  Vision: 'bg-orange-50 text-orange-700',
}

function ScoreDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < value ? 'bg-indigo-400' : 'bg-gray-200'}`} />
      ))}
    </span>
  )
}

export default function ClientPage() {
  const params = useParams()
  const clientId = params.clientId as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [vault, setVault] = useState<StoryVault | null>(null)
  const [stories, setStories] = useState<StoryWithTags[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [latestStrategy, setLatestStrategy] = useState<GeneratedAsset | null>(null)
  const [avgUtilityScore, setAvgUtilityScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'overview' | 'stories'>('overview')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // add/edit story form
  const [showForm, setShowForm] = useState(false)
  const [editingStory, setEditingStory] = useState<StoryWithTags | null>(null)
  const [title, setTitle] = useState('')
  const [storyType, setStoryType] = useState('')
  const [transcription, setTranscription] = useState('')
  const [shortVersion, setShortVersion] = useState('')
  const [longVersion, setLongVersion] = useState('')
  const [oneLiner, setOneLiner] = useState('')
  const [quotes, setQuotes] = useState('')
  const [useCases, setUseCases] = useState<string[]>([])
  const [clarityScore, setClarityScore] = useState('')
  const [emotionalScore, setEmotionalScore] = useState('')
  const [teachingScore, setTeachingScore] = useState('')
  const [authorityScore, setAuthorityScore] = useState('')
  const [salesScore, setSalesScore] = useState('')
  const [relatabilityScore, setRelatabilityScore] = useState('')
  const [reusabilityScore, setReusabilityScore] = useState('')
  const [storyStatus, setStoryStatus] = useState('raw')
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  // import / export
  const [showImport, setShowImport] = useState(false)
  const [exportMode, setExportMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)


  async function loadData() {
    setLoading(true)

    const [clientRes, vaultRes, projectsRes, strategyRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('story_vaults').select('*').eq('client_id', clientId).order('created_at', { ascending: true }).limit(1).maybeSingle(),
      supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('generated_assets').select('*').eq('client_id', clientId).eq('asset_type', 'social_strategy').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (clientRes.data) setClient(clientRes.data)
    if (projectsRes.data) setProjects(projectsRes.data)
    if (strategyRes.data) setLatestStrategy(strategyRes.data)

    if (vaultRes.data) {
      setVault(vaultRes.data)
      const { data: storyData } = await supabase
        .from('stories')
        .select('*, story_tags(tags(*))')
        .eq('vault_id', vaultRes.data.id)
        .order('created_at', { ascending: false })

      if (storyData) {
        const mapped = storyData.map((s: any) => ({
          ...s,
          tags: (s.story_tags || []).map((st: any) => st.tags).filter(Boolean),
        }))
        setStories(mapped)
        setSelectedIds(new Set(mapped.map((s: StoryWithTags) => s.id)))

        // Load utility scores
        const storyIds = mapped.map((s: StoryWithTags) => s.id)
        if (storyIds.length > 0) {
          const { data: scoreData } = await supabase
            .from('story_scores')
            .select('overall_utility_score')
            .in('story_id', storyIds)
          if (scoreData && scoreData.length > 0) {
            const scores = scoreData.map((s: any) => s.overall_utility_score).filter((s: any) => s != null)
            if (scores.length > 0) {
              setAvgUtilityScore(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
            }
          }
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [clientId])

  function toggleUseCase(uc: string) {
    setUseCases((prev) => prev.includes(uc) ? prev.filter((x) => x !== uc) : [...prev, uc])
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function enterExportMode() {
    setSelectedIds(new Set(filteredStories.map((s) => s.id)))
    setExportMode(true)
  }

  async function handleExport() {
    if (!client) return
    setExporting(true)
    const toExport = stories.filter((s) => selectedIds.has(s.id))
    await exportStoriesToDocx(client.name, toExport)
    setExporting(false)
    setExportMode(false)
  }

  async function saveStory(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !vault) return
    setSaving(true)

    const payload = {
      title, story_type: storyType || null,
      transcription: transcription || null, short_version: shortVersion || null,
      long_version: longVersion || null, one_liner: oneLiner || null,
      quotes: quotes || null, use_cases: useCases,
      clarity_score: clarityScore ? parseInt(clarityScore) : null,
      emotional_impact_score: emotionalScore ? parseInt(emotionalScore) : null,
      status: storyStatus,
    }

    let storyId: string | null = null

    if (editingStory) {
      const { error } = await supabase.from('stories').update(payload).eq('id', editingStory.id)
      if (error) { alert(`Error updating story: ${error.message}`); setSaving(false); return }
      storyId = editingStory.id
      // replace tags: delete existing then re-insert
      await supabase.from('story_tags').delete().eq('story_id', storyId)
    } else {
      const { data: storyData, error } = await supabase
        .from('stories').insert({ vault_id: vault.id, ...payload }).select().single()
      if (error || !storyData) { alert(`Error creating story: ${error?.message}`); setSaving(false); return }
      storyId = storyData.id
    }

    const tagNames = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
    for (const tagName of tagNames) {
      let { data: existingTag } = await supabase.from('tags').select('*').eq('name', tagName).maybeSingle()
      let tagId = existingTag?.id
      if (!tagId) {
        const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select().single()
        tagId = newTag?.id
      }
      if (tagId) await supabase.from('story_tags').insert({ story_id: storyId, tag_id: tagId })
    }

    // Upsert detailed scores if any are set
    const anyScore = clarityScore || emotionalScore || teachingScore || authorityScore || salesScore || relatabilityScore || reusabilityScore
    if (anyScore && storyId) {
      const { error: scoreErr } = await supabase.from('story_scores').upsert({
        story_id: storyId,
        clarity_score: clarityScore ? parseInt(clarityScore) : null,
        emotional_impact_score: emotionalScore ? parseInt(emotionalScore) : null,
        teaching_value_score: teachingScore ? parseInt(teachingScore) : null,
        authority_value_score: authorityScore ? parseInt(authorityScore) : null,
        sales_value_score: salesScore ? parseInt(salesScore) : null,
        relatability_score: relatabilityScore ? parseInt(relatabilityScore) : null,
        reusability_score: reusabilityScore ? parseInt(reusabilityScore) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'story_id' })
      if (scoreErr) alert(`Score save failed: ${scoreErr.message}`)
    }

    resetForm()
    setShowForm(false)
    loadData()
    setSaving(false)
  }

  function resetForm() {
    setTitle(''); setStoryType(''); setTranscription(''); setShortVersion(''); setLongVersion('')
    setOneLiner(''); setQuotes(''); setUseCases([])
    setClarityScore(''); setEmotionalScore(''); setTeachingScore(''); setAuthorityScore('')
    setSalesScore(''); setRelatabilityScore(''); setReusabilityScore('')
    setStoryStatus('raw'); setTagInput(''); setEditingStory(null)
  }

  async function openEditStory(story: StoryWithTags) {
    setTitle(story.title)
    setStoryType(story.story_type ?? '')
    setTranscription(story.transcription ?? '')
    setShortVersion(story.short_version ?? '')
    setLongVersion(story.long_version ?? '')
    setOneLiner(story.one_liner ?? '')
    setQuotes(story.quotes ?? '')
    setUseCases(story.use_cases ?? [])
    setStoryStatus(story.status)
    setTagInput(story.tags.map((t) => t.name).join(', '))
    setEditingStory(story)

    const { data: sc } = await supabase.from('story_scores').select('*').eq('story_id', story.id).maybeSingle()
    setClarityScore((sc?.clarity_score ?? story.clarity_score)?.toString() ?? '')
    setEmotionalScore((sc?.emotional_impact_score ?? story.emotional_impact_score)?.toString() ?? '')
    setTeachingScore(sc?.teaching_value_score?.toString() ?? '')
    setAuthorityScore(sc?.authority_value_score?.toString() ?? '')
    setSalesScore(sc?.sales_value_score?.toString() ?? '')
    setRelatabilityScore(sc?.relatability_score?.toString() ?? '')
    setReusabilityScore(sc?.reusability_score?.toString() ?? '')

    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteStory(storyId: string) {
    if (!confirm('Delete this story? This cannot be undone.')) return
    const { error } = await supabase.from('stories').delete().eq('id', storyId)
    if (error) { alert(`Error deleting story: ${error.message}`); return }
    loadData()
  }

  const filteredStories = filterType ? stories.filter((s) => s.story_type === filterType) : stories
  const typesInUse = [...new Set(stories.map((s) => s.story_type).filter(Boolean))] as string[]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      {/* Client header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{client?.name}</h1>
            {client?.company_name && (
              <p className="text-sm text-gray-500 mt-0.5">{client.company_name}</p>
            )}
          </div>
          <span className={`mt-1 text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
            client?.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
            client?.status === 'paused' ? 'bg-amber-50 text-amber-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {client?.status}
          </span>
        </div>

        {(client?.main_framework || client?.brand_voice) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {client.main_framework && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                {client.main_framework}
              </span>
            )}
            {client.brand_voice && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
                {client.brand_voice}
              </span>
            )}
          </div>
        )}
      </div>

      <ClientTabNav
        clientId={clientId}
        activeStoriesTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <DashboardCards
            stories={stories}
            projects={projects}
            latestStrategy={latestStrategy}
            avgUtilityScore={avgUtilityScore}
          />

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-5">Story Inventory</h2>
            <StoryTypeChart stories={stories} />
          </div>

          <StrategyPanel clientId={clientId} latestStrategy={latestStrategy} />

          <ProjectsPanel clientId={clientId} projects={projects} />
        </div>
      )}

      {activeTab === 'stories' && <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType(null)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              !filterType ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All <span className="ml-1 opacity-70">{stories.length}</span>
          </button>
          {typesInUse.map((t) => {
            const count = stories.filter((s) => s.story_type === t).length
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  filterType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t} <span className="ml-1 opacity-70">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!exportMode && (
            <>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Import
              </button>
              {stories.length > 0 && (
                <button
                  onClick={enterExportMode}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Export
                </button>
              )}
            </>
          )}
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); if (exportMode) setExportMode(false) }}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {showForm ? 'Cancel' : 'New Story'}
          </button>
        </div>
      </div>

      {/* Export bar */}
      {exportMode && (
        <div className="mb-5 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-indigo-800">
              {selectedIds.size} of {filteredStories.length} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set(filteredStories.map((s) => s.id)))}
              className="text-xs text-indigo-600 hover:underline"
            >
              Select all
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-indigo-600 hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setExportMode(false)}
              className="text-sm px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={selectedIds.size === 0 || exporting}
              className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {exporting ? 'Downloading…' : `Download .docx`}
            </button>
          </div>
        </div>
      )}

      {/* Add story form */}
      {showForm && (
        <form onSubmit={saveStory} className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">{editingStory ? 'Edit Story' : 'New Story'}</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Story Type</label>
                <select value={storyType} onChange={(e) => setStoryType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="">— Select —</option>
                  {STORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={storyStatus} onChange={(e) => setStoryStatus(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  {STORY_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">AI Transcription</label>
              <textarea value={transcription} onChange={(e) => setTranscription(e.target.value)} rows={3} placeholder="Paste from Fathom transcript…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">One-Liner</label>
              <input type="text" value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Short Version</label>
              <textarea value={shortVersion} onChange={(e) => setShortVersion(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Long Version</label>
              <textarea value={longVersion} onChange={(e) => setLongVersion(e.target.value)} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Memorable Quotes</label>
              <textarea value={quotes} onChange={(e) => setQuotes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Best Use Cases</label>
              <div className="flex flex-wrap gap-2">
                {USE_CASES.map((uc) => (
                  <button
                    type="button"
                    key={uc}
                    onClick={() => toggleUseCase(uc)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      useCases.includes(uc) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {uc.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Scores <span className="font-normal text-gray-400">(1 = low, 5 = high)</span></p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Clarity', hint: 'How clear and easy to follow?', value: clarityScore, set: setClarityScore },
                  { label: 'Emotional Impact', hint: 'How emotionally resonant?', value: emotionalScore, set: setEmotionalScore },
                  { label: 'Teaching Value', hint: 'How well does it illustrate a lesson?', value: teachingScore, set: setTeachingScore },
                  { label: 'Authority Value', hint: 'How much does it build credibility?', value: authorityScore, set: setAuthorityScore },
                  { label: 'Sales Value', hint: 'How well does it support persuasion?', value: salesScore, set: setSalesScore },
                  { label: 'Relatability', hint: 'How relatable to a broad audience?', value: relatabilityScore, set: setRelatabilityScore },
                  { label: 'Reusability', hint: 'How versatile across contexts?', value: reusabilityScore, set: setReusabilityScore },
                ].map(({ label, hint, value, set }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">{label}</label>
                    <p className="text-xs text-gray-400 mb-1">{hint}</p>
                    <select value={value} onChange={(e) => set(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                      <option value="">—</option>
                      {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tags <span className="font-normal text-gray-400">(comma separated)</span></label>
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : editingStory ? 'Save Changes' : 'Save Story'}
            </button>
          </div>
        </form>
      )}

      {/* Story list */}
      {filteredStories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-8 h-8 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm">No stories yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStories.map((story) => {
            const expanded = expandedIds.has(story.id)
            const selected = selectedIds.has(story.id)
            const hasMore = !!(story.long_version || story.transcription || story.quotes)

            return (
              <div
                key={story.id}
                className={`bg-white border rounded-xl shadow-sm transition-all ${
                  exportMode && selected ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-200'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {exportMode && (
                      <button
                        onClick={() => toggleSelect(story.id)}
                        className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 transition-colors flex items-center justify-center ${
                          selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                        }`}
                      >
                        {selected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{story.title}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {story.story_type && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[story.story_type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {story.story_type}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[story.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {story.status.replace(/_/g, ' ')}
                          </span>
                          {!exportMode && (
                            <DropdownMenu items={[
                              { label: 'Edit', onClick: () => openEditStory(story) },
                              { label: 'Delete', onClick: () => deleteStory(story.id), destructive: true },
                            ]} />
                          )}
                        </div>
                      </div>

                      {story.one_liner && (
                        <p className="text-sm italic text-gray-500 mb-2">&ldquo;{story.one_liner}&rdquo;</p>
                      )}


                      {(story.clarity_score || story.emotional_impact_score) && (
                        <div className="flex items-center gap-4 mb-3">
                          {story.clarity_score && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">Clarity</span>
                              <ScoreDots value={story.clarity_score} />
                            </div>
                          )}
                          {story.emotional_impact_score && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">Emotional</span>
                              <ScoreDots value={story.emotional_impact_score} />
                            </div>
                          )}
                        </div>
                      )}

                      {story.use_cases?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {story.use_cases.map((uc) => (
                            <span key={uc} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                              {uc.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {story.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {story.tags.map((tag) => (
                            <span key={tag.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                              #{tag.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expanded content */}
                      {expanded && (
                        <div className="mt-4 space-y-3 pt-4 border-t border-gray-100">
                          {story.short_version && (
                            <div>
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Short Version</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{story.short_version}</p>
                            </div>
                          )}
                          {story.long_version && (
                            <div>
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Long Version</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{story.long_version}</p>
                            </div>
                          )}
                          {story.quotes && (
                            <div>
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Memorable Quotes</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{story.quotes}</p>
                            </div>
                          )}
                          {story.transcription && (
                            <div>
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Transcription</p>
                              <p className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">{story.transcription}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {hasMore && (
                  <button
                    onClick={() => toggleExpand(story.id)}
                    className="w-full px-4 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors flex items-center justify-center gap-1 rounded-b-xl"
                  >
                    {expanded ? (
                      <>Show less <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg></>
                    ) : (
                      <>Show more <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      </>} {/* end stories tab */}

      {showImport && vault && (
        <ImportModal
          vaultId={vault.id}
          onClose={() => setShowImport(false)}
          onDone={loadData}
        />
      )}
    </main>
  )
}
