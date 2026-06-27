'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Client, Project, Framework, Offer, Story } from '@/lib/types'
import { PROJECT_TYPES, PROJECT_STATUSES, STORY_ROLES } from '@/lib/types'
import DropdownMenu from '@/components/DropdownMenu'

const TYPE_LABELS: Record<string, string> = {
  talk: 'Talk',
  webinar: 'Webinar',
  sales_presentation: 'Sales Presentation',
  email_campaign: 'Email Campaign',
}

const TYPE_STYLES: Record<string, string> = {
  talk: 'bg-purple-50 text-purple-700',
  webinar: 'bg-indigo-50 text-indigo-700',
  sales_presentation: 'bg-teal-50 text-teal-700',
  email_campaign: 'bg-orange-50 text-orange-700',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-blue-50 text-blue-700',
  ready_for_review: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-gray-100 text-gray-400',
}

const ROLE_LABELS: Record<string, string> = {
  opening_story: 'Opening Story',
  origin_story: 'Origin Story',
  credibility_story: 'Credibility Story',
  failure_story: 'Failure Story',
  teaching_story: 'Teaching Story',
  proof_story: 'Proof Story',
  objection_story: 'Objection Story',
  transition_story: 'Transition Story',
  closing_story: 'Closing Story',
  cta_story: 'CTA Story',
  email_story: 'Email Story',
  social_story: 'Social Story',
}

type ProjectStory = {
  id: string
  project_id: string
  story_id: string
  story_role: string | null
  position: number | null
  story: Story
}

export default function ProjectDetailPage() {
  const params = useParams()
  const clientId = params.clientId as string
  const projectId = params.projectId as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [projectStories, setProjectStories] = useState<ProjectStory[]>([])
  const [vaultStories, setVaultStories] = useState<Story[]>([])
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  const [activeSection, setActiveSection] = useState<'setup' | 'stories'>('setup')
  const [editingSetup, setEditingSetup] = useState(false)
  const [setupForm, setSetupForm] = useState({
    title: '',
    project_type: 'talk',
    status: 'draft',
    audience: '',
    goal: '',
    cta: '',
    offer_id: '',
    primary_framework_id: '',
    length_minutes: '',
    tone: '',
  })
  const [savingSetup, setSavingSetup] = useState(false)

  // Add story state
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

      // Load vault stories for this client
      const { data: vaultData } = await supabase
        .from('story_vaults')
        .select('id')
        .eq('client_id', clientId)
        .maybeSingle()

      if (vaultData) {
        const { data: storiesData } = await supabase
          .from('stories')
          .select('*')
          .eq('vault_id', vaultData.id)
          .order('title')
        if (storiesData) setVaultStories(storiesData)
      }

      // Load project stories
      const { data: psData } = await supabase
        .from('project_stories')
        .select('*, story:stories(*)')
        .eq('project_id', projectId)
        .order('position')
      if (psData) setProjectStories(psData as ProjectStory[])

    }

    setLoading(false)
  }

  useEffect(() => { load() }, [projectId])

  async function saveSetup(e: React.FormEvent) {
    e.preventDefault()
    setSavingSetup(true)

    const payload = {
      title: setupForm.title.trim(),
      project_type: setupForm.project_type,
      status: setupForm.status,
      audience: setupForm.audience.trim() || null,
      goal: setupForm.goal.trim() || null,
      cta: setupForm.cta.trim() || null,
      offer_id: setupForm.offer_id || null,
      primary_framework_id: setupForm.primary_framework_id || null,
      length_minutes: setupForm.length_minutes ? parseInt(setupForm.length_minutes) : null,
      tone: setupForm.tone.trim() || null,
    }

    const { error } = await supabase.from('projects').update(payload).eq('id', projectId)
    if (error) { alert(`Error saving project: ${error.message}`); setSavingSetup(false); return }

    setSavingSetup(false)
    setEditingSetup(false)
    load()
  }

  async function addStory(e: React.FormEvent) {
    e.preventDefault()
    if (!addStoryId) return
    setAddingStory(true)

    const already = projectStories.find(ps => ps.story_id === addStoryId)
    if (already) {
      alert('This story is already attached to this project.')
      setAddingStory(false)
      return
    }

    const nextPosition = projectStories.length
    const { error } = await supabase.from('project_stories').insert({
      project_id: projectId,
      story_id: addStoryId,
      story_role: addStoryRole || null,
      position: nextPosition,
    })

    if (error) { alert(`Error adding story: ${error.message}`); setAddingStory(false); return }

    setAddingStory(false)
    setShowAddStory(false)
    setAddStoryId('')
    setAddStoryRole('')
    load()
  }

  async function removeStory(psId: string) {
    const { error } = await supabase.from('project_stories').delete().eq('id', psId)
    if (error) { alert(`Error removing story: ${error.message}`); return }
    load()
  }

  async function updateRole(psId: string, role: string) {
    const { error } = await supabase.from('project_stories').update({ story_role: role || null }).eq('id', psId)
    if (error) { alert(`Error updating role: ${error.message}`); return }
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
    return (
      <main className="max-w-3xl mx-auto px-8 py-8">
        <p className="text-sm text-gray-500">Project not found.</p>
      </main>
    )
  }

  const fw = frameworks.find(f => f.id === project.primary_framework_id)
  const offer = offers.find(o => o.id === project.offer_id)
  const attachedIds = new Set(projectStories.map(ps => ps.story_id))
  const availableStories = vaultStories.filter(s => !attachedIds.has(s.id))

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
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[project.project_type] ?? 'bg-gray-100 text-gray-600'}`}>
              {TYPE_LABELS[project.project_type]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[project.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {project.status.replace(/_/g, ' ')}
            </span>
            {project.length_minutes && (
              <span className="text-xs text-gray-400">{project.length_minutes} min</span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{project.title}</h1>
          {project.goal && <p className="text-sm text-gray-500 mt-1">{project.goal}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {project.readiness_score != null && (
            <div className="text-right mr-2">
              <p className="text-2xl font-bold text-gray-800">{Math.round(project.readiness_score)}</p>
              <p className="text-xs text-gray-400">readiness</p>
            </div>
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['setup', 'stories'] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeSection === s
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === 'stories' ? `Stories (${projectStories.length})` : 'Setup'}
          </button>
        ))}
      </div>

      {/* Setup section */}
      {activeSection === 'setup' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Project Setup</h2>
            {!editingSetup && (
              <button
                onClick={() => setEditingSetup(true)}
                className="text-xs px-3 py-1.5 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
              >
                Edit
              </button>
            )}
          </div>

          {editingSetup ? (
            <form onSubmit={saveSetup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    required
                    value={setupForm.title}
                    onChange={e => setSetupForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={setupForm.project_type}
                    onChange={e => setSetupForm(f => ({ ...f, project_type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={setupForm.status}
                    onChange={e => setSetupForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Audience</label>
                  <input
                    value={setupForm.audience}
                    onChange={e => setSetupForm(f => ({ ...f, audience: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Goal / Outcome</label>
                  <input
                    value={setupForm.goal}
                    onChange={e => setSetupForm(f => ({ ...f, goal: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Primary Framework</label>
                  <select
                    value={setupForm.primary_framework_id}
                    onChange={e => setSetupForm(f => ({ ...f, primary_framework_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— None —</option>
                    {frameworks.map(fw => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Linked Offer</label>
                  <select
                    value={setupForm.offer_id}
                    onChange={e => setSetupForm(f => ({ ...f, offer_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— None —</option>
                    {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Length (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    value={setupForm.length_minutes}
                    onChange={e => setSetupForm(f => ({ ...f, length_minutes: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
                  <input
                    value={setupForm.tone}
                    onChange={e => setSetupForm(f => ({ ...f, tone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Call to Action</label>
                  <input
                    value={setupForm.cta}
                    onChange={e => setSetupForm(f => ({ ...f, cta: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditingSetup(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                <button
                  type="submit"
                  disabled={savingSetup}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
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

      {/* Stories section */}
      {activeSection === 'stories' && (
        <div className="space-y-3">
          {/* Add story form */}
          {showAddStory ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Attach a Story</h2>
              <form onSubmit={addStory} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Story *</label>
                  <select
                    required
                    value={addStoryId}
                    onChange={e => setAddStoryId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Select a story —</option>
                    {availableStories.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.title}{s.story_type ? ` (${s.story_type})` : ''}
                      </option>
                    ))}
                  </select>
                  {availableStories.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">All vault stories are already attached.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role in this project</label>
                  <select
                    value={addStoryRole}
                    onChange={e => setAddStoryRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— No role —</option>
                    {STORY_ROLES.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowAddStory(false); setAddStoryId(''); setAddStoryRole('') }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                  <button
                    type="submit"
                    disabled={addingStory || !addStoryId}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {addingStory ? 'Adding…' : 'Attach Story'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddStory(true)}
                disabled={availableStories.length === 0}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Attach Story
              </button>
            </div>
          )}

          {/* Attached stories */}
          {projectStories.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-1">No stories attached yet</p>
              <p className="text-xs text-gray-400">Attach stories from the vault and assign them roles in this project.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projectStories.map((ps, idx) => (
                <div key={ps.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex items-start gap-3">
                  <span className="text-xs font-mono text-gray-300 mt-0.5 w-5 text-right shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium text-gray-900">{ps.story?.title}</p>
                      {ps.story?.story_type && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ps.story.story_type}</span>
                      )}
                    </div>
                    {ps.story?.one_liner && (
                      <p className="text-xs text-gray-500 truncate">{ps.story.one_liner}</p>
                    )}
                    <div className="mt-2">
                      <select
                        value={ps.story_role ?? ''}
                        onChange={e => updateRole(ps.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-600"
                      >
                        <option value="">No role assigned</option>
                        {STORY_ROLES.map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => removeStory(ps.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors mt-0.5"
                    title="Remove from project"
                  >
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
