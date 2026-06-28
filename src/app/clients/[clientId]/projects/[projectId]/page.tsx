'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Client, Project, Framework, Offer, Story, TalkSection } from '@/lib/types'
import { PROJECT_STATUSES, TALK_TYPES, SOCIAL_MEDIA_TYPES, SECTION_ROLES, STORY_ROLES } from '@/lib/types'
import DropdownMenu from '@/components/DropdownMenu'

const TYPE_LABELS: Record<string, string> = {
  keynote: 'Keynote',
  webinar: 'Webinar',
  sales_presentation: 'Sales Presentation',
  workshop: 'Workshop',
  weekly: 'Weekly Content',
  email_campaign: 'Email Campaign',
  launch_campaign: 'Launch Campaign',
  talk: 'Talk',
}

const TYPE_STYLES: Record<string, string> = {
  keynote: 'bg-purple-50 text-purple-700',
  webinar: 'bg-indigo-50 text-indigo-700',
  sales_presentation: 'bg-teal-50 text-teal-700',
  workshop: 'bg-violet-50 text-violet-700',
  weekly: 'bg-orange-50 text-orange-700',
  email_campaign: 'bg-amber-50 text-amber-700',
  launch_campaign: 'bg-rose-50 text-rose-700',
  talk: 'bg-purple-50 text-purple-700',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-blue-50 text-blue-700',
  ready_for_review: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-gray-100 text-gray-400',
}

const OBI_CONTEXT: Record<string, { label: string; hint: string; placeholder: string }> = {
  keynote: {
    label: 'One Big Idea',
    hint: 'What is the one belief or feeling you want your audience to leave with?',
    placeholder: 'e.g. "You don\'t need more credentials — you need a better story."',
  },
  webinar: {
    label: 'One Big Idea',
    hint: 'What is the one transformation or core promise this webinar delivers?',
    placeholder: 'e.g. "By the end of this, you\'ll know exactly which stories to tell and when."',
  },
  sales_presentation: {
    label: 'One Big Domino',
    hint: 'What is the one belief shift that, if achieved, makes the sale inevitable?',
    placeholder: 'e.g. "If they believe story is the #1 sales tool, everything else follows."',
  },
  workshop: {
    label: 'One Big Idea',
    hint: 'What is the single skill or mindset shift participants walk away with?',
    placeholder: 'e.g. "Every expert has 7 stories. Most have never identified them."',
  },
}

const ROLE_LABELS: Record<string, string> = {
  opening_story: 'Opening Story', origin_story: 'Origin Story', credibility_story: 'Credibility Story',
  failure_story: 'Failure Story', teaching_story: 'Teaching Story', proof_story: 'Proof Story',
  objection_story: 'Objection Story', transition_story: 'Transition Story', closing_story: 'Closing Story',
  cta_story: 'CTA Story', email_story: 'Email Story', social_story: 'Social Story',
}

type ProjectStory = {
  id: string
  project_id: string
  story_id: string
  story_role: string | null
  position: number | null
  story: Story
}

type Tab = 'setup' | 'obi' | 'outline' | 'stories'

export default function ProjectDetailPage() {
  const params = useParams()
  const clientId = params.clientId as string
  const projectId = params.projectId as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [sections, setSections] = useState<TalkSection[]>([])
  const [projectStories, setProjectStories] = useState<ProjectStory[]>([])
  const [vaultStories, setVaultStories] = useState<Story[]>([])
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<Tab>('setup')
  const [editingSetup, setEditingSetup] = useState(false)
  const [setupForm, setSetupForm] = useState({
    title: '', project_type: 'keynote', status: 'draft',
    audience: '', goal: '', cta: '', offer_id: '', primary_framework_id: '',
    length_minutes: '', tone: '',
  })
  const [savingSetup, setSavingSetup] = useState(false)

  // OBI state
  const [obiText, setObiText] = useState('')
  const [savingObi, setSavingObi] = useState(false)
  const [obiSaved, setObiSaved] = useState(false)

  // Add section state
  const [addingSectionTitle, setAddingSectionTitle] = useState('')
  const [showAddSection, setShowAddSection] = useState(false)
  const [addingSection, setAddingSection] = useState(false)

  // Social media: add story state
  const [showAddStory, setShowAddStory] = useState(false)
  const [addStoryId, setAddStoryId] = useState('')
  const [addStoryRole, setAddStoryRole] = useState('')
  const [addingStory, setAddingStory] = useState(false)

  async function load() {
    setLoading(true)
    const [clientRes, projectRes, frameworksRes, offersRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('frameworks').select('*').eq('client_id', clientId).neq('status', 'archived').order('name'),
      supabase.from('offers').select('*').eq('client_id', clientId).neq('status', 'archived').order('name'),
    ])

    if (clientRes.data) setClient(clientRes.data)
    if (frameworksRes.data) setFrameworks(frameworksRes.data)
    if (offersRes.data) setOffers(offersRes.data)

    if (projectRes.data) {
      const p = projectRes.data
      setProject(p)
      setObiText(p.one_big_idea ?? '')
      setSetupForm({
        title: p.title,
        project_type: p.project_type,
        status: p.status,
        audience: p.audience ?? '',
        goal: p.goal ?? '',
        cta: p.cta ?? '',
        offer_id: p.offer_id ?? '',
        primary_framework_id: p.primary_framework_id ?? '',
        length_minutes: p.length_minutes ? String(p.length_minutes) : '',
        tone: p.tone ?? '',
      })

      // Load vault stories
      const { data: vaultData } = await supabase.from('story_vaults').select('id').eq('client_id', clientId).maybeSingle()
      if (vaultData) {
        const { data: storiesData } = await supabase.from('stories').select('*').eq('vault_id', vaultData.id).order('title')
        if (storiesData) setVaultStories(storiesData)
      }

      const isTalk = (p.category ?? 'talk') === 'talk'

      if (isTalk) {
        const { data: sectionsData } = await supabase
          .from('talk_sections')
          .select('*')
          .eq('project_id', projectId)
          .order('position')
        if (sectionsData) setSections(sectionsData)
      } else {
        const { data: psData } = await supabase
          .from('project_stories')
          .select('*, story:stories(*)')
          .eq('project_id', projectId)
          .order('position')
        if (psData) setProjectStories(psData as ProjectStory[])
      }
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [projectId])

  // --- Setup ---
  async function saveSetup(e: React.FormEvent) {
    e.preventDefault()
    setSavingSetup(true)
    const isTalk = (project?.category ?? 'talk') === 'talk'
    const payload = {
      title: setupForm.title.trim(),
      project_type: setupForm.project_type,
      status: setupForm.status,
      audience: setupForm.audience.trim() || null,
      goal: setupForm.goal.trim() || null,
      cta: isTalk ? setupForm.cta.trim() || null : null,
      offer_id: isTalk ? setupForm.offer_id || null : null,
      primary_framework_id: isTalk ? setupForm.primary_framework_id || null : null,
      length_minutes: isTalk && setupForm.length_minutes ? parseInt(setupForm.length_minutes) : null,
      tone: isTalk ? setupForm.tone.trim() || null : null,
    }
    const { error } = await supabase.from('projects').update(payload).eq('id', projectId)
    if (error) { alert(`Error saving project: ${error.message}`); setSavingSetup(false); return }
    setSavingSetup(false)
    setEditingSetup(false)
    load()
  }

  // --- OBI ---
  async function saveObi() {
    setSavingObi(true)
    await supabase.from('projects').update({ one_big_idea: obiText.trim() || null }).eq('id', projectId)
    setSavingObi(false)
    setObiSaved(true)
    setTimeout(() => setObiSaved(false), 2000)
    load()
  }

  // --- Sections ---
  async function addSection(e: React.FormEvent) {
    e.preventDefault()
    if (!addingSectionTitle.trim()) return
    setAddingSection(true)
    const { error } = await supabase.from('talk_sections').insert({
      project_id: projectId,
      title: addingSectionTitle.trim(),
      position: sections.length,
    })
    if (error) { alert(`Error adding section: ${error.message}`); setAddingSection(false); return }
    setAddingSection(false)
    setAddingSectionTitle('')
    setShowAddSection(false)
    load()
  }

  async function updateSection(id: string, updates: Partial<TalkSection>) {
    await supabase.from('talk_sections').update(updates).eq('id', id)
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  async function deleteSection(id: string) {
    if (!confirm('Delete this section? This cannot be undone.')) return
    await supabase.from('talk_sections').delete().eq('id', id)
    load()
  }

  async function moveSection(id: string, dir: 'up' | 'down') {
    const idx = sections.findIndex(s => s.id === id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sections.length) return
    const a = sections[idx]
    const b = sections[swapIdx]
    await Promise.all([
      supabase.from('talk_sections').update({ position: b.position }).eq('id', a.id),
      supabase.from('talk_sections').update({ position: a.position }).eq('id', b.id),
    ])
    load()
  }

  // --- Social media stories ---
  async function addStory(e: React.FormEvent) {
    e.preventDefault()
    if (!addStoryId) return
    setAddingStory(true)
    const already = projectStories.find(ps => ps.story_id === addStoryId)
    if (already) { alert('This story is already attached.'); setAddingStory(false); return }
    const { error } = await supabase.from('project_stories').insert({
      project_id: projectId,
      story_id: addStoryId,
      story_role: addStoryRole || null,
      position: projectStories.length,
    })
    if (error) { alert(`Error adding story: ${error.message}`); setAddingStory(false); return }
    setAddingStory(false)
    setShowAddStory(false)
    setAddStoryId('')
    setAddStoryRole('')
    load()
  }

  async function removeStory(psId: string) {
    await supabase.from('project_stories').delete().eq('id', psId)
    load()
  }

  async function updateRole(psId: string, role: string) {
    await supabase.from('project_stories').update({ story_role: role || null }).eq('id', psId)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return <main className="max-w-3xl mx-auto px-8 py-8"><p className="text-sm text-gray-500">Project not found.</p></main>
  }

  const isTalk = (project.category ?? 'talk') === 'talk'
  const fw = frameworks.find(f => f.id === project.primary_framework_id)
  const offer = offers.find(o => o.id === project.offer_id)
  const obiContext = OBI_CONTEXT[project.project_type] ?? OBI_CONTEXT.keynote
  const attachedIds = new Set(projectStories.map(ps => ps.story_id))
  const availableStories = vaultStories.filter(s => !attachedIds.has(s.id))

  const tabs: { key: Tab; label: string }[] = isTalk
    ? [
        { key: 'setup', label: 'Setup' },
        { key: 'obi', label: obiContext.label },
        { key: 'outline', label: `Outline${sections.length ? ` (${sections.length})` : ''}` },
      ]
    : [
        { key: 'setup', label: 'Setup' },
        { key: 'stories', label: `Stories${projectStories.length ? ` (${projectStories.length})` : ''}` },
      ]

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link href={`/clients/${clientId}`} className="hover:text-gray-600">{client?.name}</Link>
        <span>›</span>
        <Link href={`/clients/${clientId}/projects`} className="hover:text-gray-600">Projects</Link>
        <span>›</span>
        <span className="text-gray-600 font-medium truncate max-w-xs">{project.title}</span>
      </div>

      {/* Project header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isTalk ? 'bg-gray-100 text-gray-500' : 'bg-orange-50 text-orange-600'}`}>
              {isTalk ? 'Talk' : 'Social Media'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[project.project_type] ?? 'bg-gray-100 text-gray-600'}`}>
              {TYPE_LABELS[project.project_type] ?? project.project_type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[project.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {project.status.replace(/_/g, ' ')}
            </span>
            {project.length_minutes && <span className="text-xs text-gray-400">{project.length_minutes} min</span>}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{project.title}</h1>
          {project.goal && <p className="text-sm text-gray-500 mt-1">{project.goal}</p>}
          {project.one_big_idea && (
            <p className="text-sm text-indigo-600 mt-1.5 italic">"{project.one_big_idea}"</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Setup tab */}
      {activeTab === 'setup' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Project Setup</h2>
            {!editingSetup && (
              <button onClick={() => setEditingSetup(true)} className="text-xs px-3 py-1.5 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
                Edit
              </button>
            )}
          </div>

          {editingSetup ? (
            <form onSubmit={saveSetup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                  <input required value={setupForm.title} onChange={e => setSetupForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={setupForm.project_type} onChange={e => setSetupForm(f => ({ ...f, project_type: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {(isTalk ? TALK_TYPES : SOCIAL_MEDIA_TYPES).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={setupForm.status} onChange={e => setSetupForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Audience</label>
                  <input value={setupForm.audience} onChange={e => setSetupForm(f => ({ ...f, audience: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Goal / Outcome</label>
                  <input value={setupForm.goal} onChange={e => setSetupForm(f => ({ ...f, goal: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {isTalk && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Primary Framework</label>
                      <select value={setupForm.primary_framework_id} onChange={e => setSetupForm(f => ({ ...f, primary_framework_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">— None —</option>
                        {frameworks.map(fw => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Linked Offer</label>
                      <select value={setupForm.offer_id} onChange={e => setSetupForm(f => ({ ...f, offer_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">— None —</option>
                        {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Length (minutes)</label>
                      <input type="number" min={1} value={setupForm.length_minutes} onChange={e => setSetupForm(f => ({ ...f, length_minutes: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
                      <input value={setupForm.tone} onChange={e => setSetupForm(f => ({ ...f, tone: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Call to Action</label>
                      <input value={setupForm.cta} onChange={e => setSetupForm(f => ({ ...f, cta: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditingSetup(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                <button type="submit" disabled={savingSetup} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {savingSetup ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { label: 'Audience', value: project.audience },
                { label: 'Goal', value: project.goal },
                { label: 'Framework', value: fw?.name },
                { label: 'Offer', value: offer?.name },
                { label: 'Length', value: project.length_minutes ? `${project.length_minutes} minutes` : null },
                { label: 'Tone', value: project.tone },
                { label: 'Call to Action', value: project.cta, span: true },
              ].map(({ label, value, span }) =>
                value ? (
                  <div key={label} className={span ? 'col-span-2' : ''}>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm text-gray-800">{value}</p>
                  </div>
                ) : null
              )}
              {!project.audience && !project.goal && !project.tone && !project.cta && !fw && !offer && !project.length_minutes && (
                <p className="col-span-2 text-sm text-gray-400 italic">No setup details yet. Click Edit to add them.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* OBI tab */}
      {activeTab === 'obi' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">{obiContext.label}</h2>
            <p className="text-xs text-gray-500">{obiContext.hint}</p>
          </div>
          <textarea
            value={obiText}
            onChange={e => setObiText(e.target.value)}
            rows={4}
            placeholder={obiContext.placeholder}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="flex items-center justify-end gap-3 mt-3">
            {obiSaved && <span className="text-xs text-emerald-600">Saved</span>}
            <button
              onClick={saveObi}
              disabled={savingObi || obiText === (project.one_big_idea ?? '')}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {savingObi ? 'Saving…' : 'Save'}
            </button>
          </div>

          {project.one_big_idea && (
            <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
              <p className="text-xs font-medium text-indigo-700 mb-1">Current {obiContext.label}</p>
              <p className="text-sm text-indigo-900 italic">"{project.one_big_idea}"</p>
            </div>
          )}
        </div>
      )}

      {/* Outline tab */}
      {activeTab === 'outline' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{sections.length} section{sections.length !== 1 ? 's' : ''}</p>
            {!showAddSection && (
              <button
                onClick={() => setShowAddSection(true)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Section
              </button>
            )}
          </div>

          {showAddSection && (
            <form onSubmit={addSection} className="flex gap-2">
              <input
                autoFocus
                required
                value={addingSectionTitle}
                onChange={e => setAddingSectionTitle(e.target.value)}
                placeholder="Section title, e.g. Introduction, The Problem, Framework…"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button type="button" onClick={() => { setShowAddSection(false); setAddingSectionTitle('') }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button type="submit" disabled={addingSection} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {addingSection ? 'Adding…' : 'Add'}
              </button>
            </form>
          )}

          {sections.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-1">No sections yet</p>
              <p className="text-xs text-gray-400">Add sections to build out your talk outline — Introduction, The Problem, Framework, Proof, Close, etc.</p>
            </div>
          ) : (
            sections.map((section, idx) => (
              <SectionCard
                key={section.id}
                section={section}
                sectionNumber={idx + 1}
                isFirst={idx === 0}
                isLast={idx === sections.length - 1}
                vaultStories={vaultStories}
                onUpdate={updateSection}
                onDelete={deleteSection}
                onMove={moveSection}
              />
            ))
          )}
        </div>
      )}

      {/* Stories tab (social media only) */}
      {activeTab === 'stories' && (
        <div className="space-y-3">
          {showAddStory ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Attach a Story</h2>
              <form onSubmit={addStory} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Story *</label>
                  <select required value={addStoryId} onChange={e => setAddStoryId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— Select a story —</option>
                    {availableStories.map(s => <option key={s.id} value={s.id}>{s.title}{s.story_type ? ` (${s.story_type})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <select value={addStoryRole} onChange={e => setAddStoryRole(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— No role —</option>
                    {STORY_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowAddStory(false); setAddStoryId(''); setAddStoryRole('') }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                  <button type="submit" disabled={addingStory || !addStoryId} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {addingStory ? 'Adding…' : 'Attach Story'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex justify-end">
              <button onClick={() => setShowAddStory(true)} disabled={availableStories.length === 0} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-40">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Attach Story
              </button>
            </div>
          )}

          {projectStories.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-1">No stories attached</p>
              <p className="text-xs text-gray-400">Pick stories from the vault to repurpose for this content project.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projectStories.map((ps, idx) => (
                <div key={ps.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex items-start gap-3">
                  <span className="text-xs font-mono text-gray-300 mt-0.5 w-5 text-right shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium text-gray-900">{ps.story?.title}</p>
                      {ps.story?.story_type && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ps.story.story_type}</span>}
                    </div>
                    {ps.story?.one_liner && <p className="text-xs text-gray-500 truncate">{ps.story.one_liner}</p>}
                    <div className="mt-2">
                      <select value={ps.story_role ?? ''} onChange={e => updateRole(ps.id, e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-600">
                        <option value="">No role assigned</option>
                        {STORY_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={() => removeStory(ps.id)} className="text-gray-300 hover:text-red-400 transition-colors mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}

function SectionCard({
  section, sectionNumber, isFirst, isLast, vaultStories, onUpdate, onDelete, onMove,
}: {
  section: TalkSection
  sectionNumber: number
  isFirst: boolean
  isLast: boolean
  vaultStories: Story[]
  onUpdate: (id: string, updates: Partial<TalkSection>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onMove: (id: string, dir: 'up' | 'down') => Promise<void>
}) {
  const [title, setTitle] = useState(section.title)
  const [notes, setNotes] = useState(section.notes ?? '')
  const [script, setScript] = useState(section.script ?? '')
  const [showNotes, setShowNotes] = useState(!!section.notes)
  const [showStoryPicker, setShowStoryPicker] = useState(false)
  const [pickStoryId, setPickStoryId] = useState('')
  const [pickRole, setPickRole] = useState('')
  const [attaching, setAttaching] = useState(false)

  const attachedStory = vaultStories.find(s => s.id === section.story_id)

  async function attachStory() {
    if (!pickStoryId) return
    setAttaching(true)
    await onUpdate(section.id, { story_id: pickStoryId, story_role: pickRole || null })
    setAttaching(false)
    setShowStoryPicker(false)
    setPickStoryId('')
    setPickRole('')
  }

  const menuItems = [
    ...(!isFirst ? [{ label: 'Move Up', onClick: () => onMove(section.id, 'up') }] : []),
    ...(!isLast ? [{ label: 'Move Down', onClick: () => onMove(section.id, 'down') }] : []),
    { label: 'Delete', onClick: () => onDelete(section.id), destructive: true as const },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-mono text-gray-400 w-5 text-center shrink-0">{sectionNumber}</span>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== section.title && onUpdate(section.id, { title: title.trim() })}
          className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-0 outline-none focus:ring-0 p-0 placeholder:text-gray-300"
          placeholder="Section title"
        />
        {menuItems.length > 0 && <DropdownMenu items={menuItems} />}
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Notes */}
        <div>
          <button
            onClick={() => setShowNotes(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${showNotes ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {showNotes ? 'Hide notes' : 'Add notes'}
          </button>
          {showNotes && (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => notes !== (section.notes ?? '') && onUpdate(section.id, { notes: notes || null })}
              rows={2}
              placeholder="Key points, reminders, or context for this section…"
              className="mt-2 w-full px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>

        {/* Script */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Script</label>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            onBlur={() => script !== (section.script ?? '') && onUpdate(section.id, { script: script || null })}
            rows={6}
            placeholder="Write the script for this section…"
            className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Story slot */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Story</label>
          {attachedStory ? (
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-indigo-900 truncate">{attachedStory.title}</p>
                {section.story_role && (
                  <p className="text-xs text-indigo-500 mt-0.5">{section.story_role}</p>
                )}
              </div>
              <button onClick={() => onUpdate(section.id, { story_id: null, story_role: null })} className="text-indigo-300 hover:text-red-400 transition-colors shrink-0" title="Remove story">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : showStoryPicker ? (
            <div className="space-y-2">
              <select value={pickStoryId} onChange={e => setPickStoryId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Select a story —</option>
                {vaultStories.map(s => <option key={s.id} value={s.id}>{s.title}{s.story_type ? ` (${s.story_type})` : ''}</option>)}
              </select>
              <select value={pickRole} onChange={e => setPickRole(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Role in this section —</option>
                {SECTION_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setShowStoryPicker(false); setPickStoryId(''); setPickRole('') }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="button" onClick={attachStory} disabled={!pickStoryId || attaching} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {attaching ? 'Attaching…' : 'Attach'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowStoryPicker(true)} className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Attach a story to this section
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
