'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Client, Project, Framework, Offer } from '@/lib/types'
import { PROJECT_TYPES, PROJECT_STATUSES } from '@/lib/types'
import ClientTabNav from '@/components/ClientTabNav'
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

const EMPTY_FORM = {
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
}

export default function ProjectsPage() {
  const params = useParams()
  const clientId = params.clientId as string
  const router = useRouter()
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [clientRes, projectsRes, frameworksRes, offersRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('frameworks').select('*').eq('client_id', clientId).neq('status', 'archived').order('name'),
      supabase.from('offers').select('*').eq('client_id', clientId).neq('status', 'archived').order('name'),
    ])
    if (clientRes.data) setClient(clientRes.data)
    if (projectsRes.data) setProjects(projectsRes.data)
    if (frameworksRes.data) setFrameworks(frameworksRes.data)
    if (offersRes.data) setOffers(offersRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [clientId])

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)

    const payload = {
      client_id: clientId,
      title: form.title.trim(),
      project_type: form.project_type,
      status: form.status,
      audience: form.audience.trim() || null,
      goal: form.goal.trim() || null,
      cta: form.cta.trim() || null,
      offer_id: form.offer_id || null,
      primary_framework_id: form.primary_framework_id || null,
      length_minutes: form.length_minutes ? parseInt(form.length_minutes) : null,
      tone: form.tone.trim() || null,
    }

    const { data, error } = await supabase.from('projects').insert(payload).select().single()
    if (error || !data) { alert(`Error creating project: ${error?.message}`); setSaving(false); return }

    setSaving(false)
    router.push(`/clients/${clientId}/projects/${data.id}`)
  }

  async function archiveProject(project: Project) {
    const next = project.status === 'archived' ? 'draft' : 'archived'
    const { error } = await supabase.from('projects').update({ status: next }).eq('id', project.id)
    if (error) { alert(`Error updating project: ${error.message}`); return }
    load()
  }

  async function deleteProject(project: Project) {
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return
    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    if (error) { alert(`Error deleting project: ${error.message}`); return }
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const active = projects.filter(p => p.status !== 'archived')
  const archived = projects.filter(p => p.status === 'archived')

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{client?.name}</h1>
            {client?.company_name && <p className="text-sm text-gray-500 mt-0.5">{client.company_name}</p>}
          </div>
          <span className={`mt-1 text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
            client?.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
            client?.status === 'paused' ? 'bg-amber-50 text-amber-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {client?.status}
          </span>
        </div>
      </div>

      <ClientTabNav clientId={clientId} />

      {/* New project form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">New Project</h2>
          <form onSubmit={createProject} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Keynote: From Burnout to Breakthrough"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={form.project_type}
                  onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PROJECT_TYPES.map(t => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PROJECT_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Audience</label>
                <input
                  value={form.audience}
                  onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                  placeholder="Who will be in the room?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Goal / Outcome</label>
                <input
                  value={form.goal}
                  onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                  placeholder="What should the audience walk away with?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Primary Framework</label>
                <select
                  value={form.primary_framework_id}
                  onChange={e => setForm(f => ({ ...f, primary_framework_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— None —</option>
                  {frameworks.map(fw => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Linked Offer</label>
                <select
                  value={form.offer_id}
                  onChange={e => setForm(f => ({ ...f, offer_id: e.target.value }))}
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
                  value={form.length_minutes}
                  onChange={e => setForm(f => ({ ...f, length_minutes: e.target.value }))}
                  placeholder="45"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
                <input
                  value={form.tone}
                  onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}
                  placeholder="e.g. Motivational, Educational"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Call to Action</label>
                <input
                  value={form.cta}
                  onChange={e => setForm(f => ({ ...f, cta: e.target.value }))}
                  placeholder="What do you want the audience to do next?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create Project →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{active.length} project{active.length !== 1 ? 's' : ''}</p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Project
          </button>
        )}
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No projects yet</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Build a talk, webinar, presentation, or email campaign using stories from the vault.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              clientId={clientId}
              frameworks={frameworks}
              offers={offers}
              onArchive={archiveProject}
              onDelete={deleteProject}
            />
          ))}
          {archived.length > 0 && (
            <details>
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 py-2 select-none">
                {archived.length} archived
              </summary>
              <div className="space-y-3 mt-2">
                {archived.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    clientId={clientId}
                    frameworks={frameworks}
                    offers={offers}
                    onArchive={archiveProject}
                    onDelete={deleteProject}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </main>
  )
}

function ProjectCard({
  project,
  clientId,
  frameworks,
  offers,
  onArchive,
  onDelete,
}: {
  project: Project
  clientId: string
  frameworks: Framework[]
  offers: Offer[]
  onArchive: (p: Project) => void
  onDelete: (p: Project) => void
}) {
  const fw = frameworks.find(f => f.id === project.primary_framework_id)
  const offer = offers.find(o => o.id === project.offer_id)

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${project.status === 'archived' ? 'opacity-60' : ''}`}>
      <Link href={`/clients/${clientId}/projects/${project.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
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
            <h3 className="text-sm font-semibold text-gray-900">{project.title}</h3>
            {project.goal && <p className="text-xs text-gray-500 mt-0.5 truncate">{project.goal}</p>}
            <div className="flex gap-3 mt-2">
              {fw && <span className="text-xs text-gray-400">Framework: <span className="text-gray-600">{fw.name}</span></span>}
              {offer && <span className="text-xs text-gray-400">Offer: <span className="text-gray-600">{offer.name}</span></span>}
            </div>
          </div>
          {project.readiness_score != null && (
            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-gray-800">{Math.round(project.readiness_score)}</p>
              <p className="text-xs text-gray-400">readiness</p>
            </div>
          )}
        </div>
      </Link>
      <div className="px-4 pb-3 flex justify-end">
        <DropdownMenu
          items={[
            { label: project.status === 'archived' ? 'Unarchive' : 'Archive', onClick: () => onArchive(project) },
            { label: 'Delete', onClick: () => onDelete(project), destructive: true },
          ]}
        />
      </div>
    </div>
  )
}
