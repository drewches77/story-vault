'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Client, Framework } from '@/lib/types'
import { FRAMEWORK_TYPES, FRAMEWORK_STATUSES } from '@/lib/types'
import ClientTabNav from '@/components/ClientTabNav'
import DropdownMenu from '@/components/DropdownMenu'

const TYPE_LABELS: Record<string, string> = {
  authority: 'Authority',
  client_ip: 'Client IP',
  talk_framework: 'Talk Framework',
  webinar_framework: 'Webinar Framework',
  sales_framework: 'Sales Framework',
  content_framework: 'Content Framework',
  offer_framework: 'Offer Framework',
  other: 'Other',
}

const TYPE_STYLES: Record<string, string> = {
  authority: 'bg-purple-50 text-purple-700',
  client_ip: 'bg-blue-50 text-blue-700',
  talk_framework: 'bg-teal-50 text-teal-700',
  webinar_framework: 'bg-cyan-50 text-cyan-700',
  sales_framework: 'bg-emerald-50 text-emerald-700',
  content_framework: 'bg-orange-50 text-orange-700',
  offer_framework: 'bg-amber-50 text-amber-700',
  other: 'bg-gray-100 text-gray-600',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  reviewed: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-gray-100 text-gray-400',
}

const EMPTY_FORM = {
  name: '',
  framework_type: '',
  description: '',
  visual_metaphor: '',
  best_use_cases: '',
  status: 'draft',
}

export default function FrameworksPage() {
  const params = useParams()
  const clientId = params.clientId as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Framework | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [clientRes, fwRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('frameworks').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ])
    if (clientRes.data) setClient(clientRes.data)
    if (fwRes.data) setFrameworks(fwRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [clientId])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(fw: Framework) {
    setEditing(fw)
    setForm({
      name: fw.name,
      framework_type: fw.framework_type ?? '',
      description: fw.description ?? '',
      visual_metaphor: fw.visual_metaphor ?? '',
      best_use_cases: (fw.best_use_cases ?? []).join(', '),
      status: fw.status,
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function saveFramework(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      client_id: clientId,
      name: form.name.trim(),
      framework_type: form.framework_type || null,
      description: form.description.trim() || null,
      visual_metaphor: form.visual_metaphor.trim() || null,
      best_use_cases: form.best_use_cases ? form.best_use_cases.split(',').map(s => s.trim()).filter(Boolean) : [],
      status: form.status,
    }

    if (editing) {
      const { error } = await supabase.from('frameworks').update(payload).eq('id', editing.id)
      if (error) { alert(`Error updating framework: ${error.message}`); setSaving(false); return }
    } else {
      const { error } = await supabase.from('frameworks').insert(payload)
      if (error) { alert(`Error creating framework: ${error.message}`); setSaving(false); return }
    }

    setSaving(false)
    cancelForm()
    load()
  }

  async function deleteFramework(fw: Framework) {
    if (!confirm(`Delete "${fw.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('frameworks').delete().eq('id', fw.id)
    if (error) { alert(`Error deleting framework: ${error.message}`); return }
    load()
  }

  async function archiveFramework(fw: Framework) {
    const next = fw.status === 'archived' ? 'draft' : 'archived'
    const { error } = await supabase.from('frameworks').update({ status: next }).eq('id', fw.id)
    if (error) { alert(`Error updating framework: ${error.message}`); return }
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const active = frameworks.filter(f => f.status !== 'archived')
  const archived = frameworks.filter(f => f.status === 'archived')

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      {/* Client header */}
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

      {/* Add / edit form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{editing ? 'Edit Framework' : 'New Framework'}</h2>
          <form onSubmit={saveFramework} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. The Authority Triangle"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.framework_type}
                  onChange={e => setForm(f => ({ ...f, framework_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Select type —</option>
                  {FRAMEWORK_TYPES.map(t => (
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
                  {FRAMEWORK_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What is this framework and how does it work?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Visual Metaphor</label>
                <input
                  value={form.visual_metaphor}
                  onChange={e => setForm(f => ({ ...f, visual_metaphor: e.target.value }))}
                  placeholder="e.g. A triangle with three pillars"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Best Use Cases <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input
                  value={form.best_use_cases}
                  onChange={e => setForm(f => ({ ...f, best_use_cases: e.target.value }))}
                  placeholder="keynote, webinar, sales call"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={cancelForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Framework'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{active.length} framework{active.length !== 1 ? 's' : ''}</p>
        {!showForm && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Framework
          </button>
        )}
      </div>

      {/* Framework list */}
      {frameworks.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No frameworks yet</p>
          <p className="text-xs text-gray-400">Add your client's teaching frameworks, IP, and methodologies.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(fw => (
            <FrameworkCard key={fw.id} fw={fw} onEdit={openEdit} onArchive={archiveFramework} onDelete={deleteFramework} />
          ))}
          {archived.length > 0 && (
            <details className="group">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 py-2 select-none">
                {archived.length} archived
              </summary>
              <div className="space-y-3 mt-2">
                {archived.map(fw => (
                  <FrameworkCard key={fw.id} fw={fw} onEdit={openEdit} onArchive={archiveFramework} onDelete={deleteFramework} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </main>
  )
}

function FrameworkCard({
  fw,
  onEdit,
  onArchive,
  onDelete,
}: {
  fw: Framework
  onEdit: (fw: Framework) => void
  onArchive: (fw: Framework) => void
  onDelete: (fw: Framework) => void
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-4 ${fw.status === 'archived' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{fw.name}</h3>
            {fw.framework_type && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[fw.framework_type] ?? 'bg-gray-100 text-gray-600'}`}>
                {TYPE_LABELS[fw.framework_type]}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[fw.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {fw.status}
            </span>
          </div>
          {fw.description && <p className="text-sm text-gray-600 mt-1">{fw.description}</p>}
          <div className="flex flex-wrap gap-3 mt-2">
            {fw.visual_metaphor && (
              <span className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Metaphor:</span> {fw.visual_metaphor}
              </span>
            )}
            {fw.best_use_cases && fw.best_use_cases.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-700">Use cases:</span>
                <div className="flex gap-1 flex-wrap">
                  {fw.best_use_cases.map((uc, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{uc}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <DropdownMenu
          items={[
            { label: 'Edit', onClick: () => onEdit(fw) },
            { label: fw.status === 'archived' ? 'Unarchive' : 'Archive', onClick: () => onArchive(fw) },
            { label: 'Delete', onClick: () => onDelete(fw), destructive: true },
          ]}
        />
      </div>
    </div>
  )
}
