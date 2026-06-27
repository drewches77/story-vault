'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Client } from '@/lib/types'
import { CLIENT_STATUSES } from '@/lib/types'
import DropdownMenu from './DropdownMenu'

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-400',
  paused: 'bg-amber-400',
  archived: 'bg-gray-300',
}

type ModalMode = 'create' | 'edit'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<Client[]>([])
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [mainFramework, setMainFramework] = useState('')
  const [brandVoice, setBrandVoice] = useState('')
  const [status, setStatus] = useState('active')
  const [saving, setSaving] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  async function loadClients() {
    const { data } = await supabase.from('clients').select('*').order('name', { ascending: true })
    if (data) setClients(data)
  }

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function openCreate() {
    resetForm()
    setModalMode('create')
    setEditingClient(null)
    setShowModal(true)
  }

  function openEdit(client: Client) {
    setName(client.name)
    setEmail(client.email ?? '')
    setCompanyName(client.company_name ?? '')
    setMainFramework(client.main_framework ?? '')
    setBrandVoice(client.brand_voice ?? '')
    setStatus(client.status)
    setModalMode('edit')
    setEditingClient(client)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingClient(null)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const resolvedName = (fd.get('name') as string) || name
    if (!resolvedName.trim()) return
    setSaving(true)

    const resolvedEmail = (fd.get('email') as string) || email
    const resolvedCompany = (fd.get('company_name') as string) || companyName
    const resolvedFramework = (fd.get('main_framework') as string) || mainFramework
    const resolvedVoice = (fd.get('brand_voice') as string) || brandVoice

    const payload = {
      name: resolvedName,
      email: resolvedEmail || null,
      company_name: resolvedCompany || null,
      main_framework: resolvedFramework || null,
      brand_voice: resolvedVoice || null,
      status,
    }

    if (modalMode === 'edit' && editingClient) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id)
      setSaving(false)
      if (error) { alert(`Error updating client: ${error.message}`); return }
      closeModal()
      await loadClients()
    } else {
      const { data, error } = await supabase.from('clients').insert(payload).select().single()
      setSaving(false)
      if (error || !data) { alert(`Error creating client: ${error?.message ?? 'No data returned'}`); return }
      closeModal()
      await loadClients()
      router.push(`/clients/${data.id}`)
    }
  }

  async function archiveClient(client: Client) {
    const newStatus = client.status === 'archived' ? 'active' : 'archived'
    const { error } = await supabase.from('clients').update({ status: newStatus }).eq('id', client.id)
    if (error) { alert(`Error: ${error.message}`); return }
    await loadClients()
    if (newStatus === 'archived' && pathname === `/clients/${client.id}`) {
      router.push('/')
    }
  }

  async function deleteClient(client: Client) {
    if (!confirm(`Permanently delete "${client.name}" and all their stories, frameworks, offers, and projects? This cannot be undone.`)) return

    // Cascade delete all child records in dependency order
    const { data: vault } = await supabase.from('story_vaults').select('id').eq('client_id', client.id).maybeSingle()
    if (vault) {
      const { data: stories } = await supabase.from('stories').select('id').eq('vault_id', vault.id)
      const storyIds = (stories ?? []).map((s: any) => s.id)
      if (storyIds.length > 0) {
        await supabase.from('story_tags').delete().in('story_id', storyIds)
        await supabase.from('story_scores').delete().in('story_id', storyIds)
      }
      await supabase.from('stories').delete().eq('vault_id', vault.id)
      await supabase.from('story_vaults').delete().eq('id', vault.id)
    }

    const { data: frameworks } = await supabase.from('frameworks').select('id').eq('client_id', client.id)
    const fwIds = (frameworks ?? []).map((f: any) => f.id)
    if (fwIds.length > 0) await supabase.from('framework_stories').delete().in('framework_id', fwIds)
    await supabase.from('frameworks').delete().eq('client_id', client.id)

    await supabase.from('offers').delete().eq('client_id', client.id)

    const { data: projects } = await supabase.from('projects').select('id').eq('client_id', client.id)
    const projectIds = (projects ?? []).map((p: any) => p.id)
    if (projectIds.length > 0) await supabase.from('project_stories').delete().in('project_id', projectIds)
    await supabase.from('projects').delete().eq('client_id', client.id)

    await supabase.from('generated_assets').delete().eq('client_id', client.id)

    const { error } = await supabase.from('clients').delete().eq('id', client.id)
    if (error) { alert(`Error deleting client: ${error.message}`); return }

    if (pathname.startsWith(`/clients/${client.id}`)) router.push('/')
    await loadClients()
  }

  function resetForm() {
    setName(''); setEmail(''); setCompanyName(''); setMainFramework(''); setBrandVoice(''); setStatus('active')
  }

  const activeClients = clients.filter((c) => c.status !== 'archived')
  const archivedClients = clients.filter((c) => c.status === 'archived')

  function ClientRow({ client, dimmed = false }: { client: Client; dimmed?: boolean }) {
    const active = pathname === `/clients/${client.id}`
    return (
      <div className={`group flex items-center gap-1 rounded-md ${active ? 'bg-indigo-50' : 'hover:bg-gray-100'}`}>
        <Link
          href={`/clients/${client.id}`}
          className={`flex items-center gap-2.5 px-2 py-1.5 text-sm flex-1 min-w-0 transition-colors ${
            active ? 'text-indigo-700 font-medium' : dimmed ? 'text-gray-400' : 'text-gray-700'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[client.status] ?? 'bg-gray-300'}`} />
          <span className="truncate">{client.name}</span>
        </Link>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-1 shrink-0">
          <DropdownMenu items={[
            { label: 'Edit', onClick: () => openEdit(client) },
            { label: client.status === 'archived' ? 'Unarchive' : 'Archive', onClick: () => archiveClient(client) },
            ...(client.status === 'archived' ? [{ label: 'Delete', onClick: () => deleteClient(client), destructive: true }] : []),
          ]} />
        </div>
      </div>
    )
  }

  return (
    <>
      <aside className="w-60 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
        <div className="px-4 py-5 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/af-icon.png" alt="Authority Forge" width={28} height={28} className="shrink-0" />
            <span className="font-semibold text-gray-900 text-sm tracking-tight">Story Vault</span>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-3">
          <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Clients</p>
          {activeClients.length === 0 && (
            <p className="px-2 text-xs text-gray-400 py-2">No clients yet.</p>
          )}
          {activeClients.map((client) => <ClientRow key={client.id} client={client} />)}

          {archivedClients.length > 0 && (
            <>
              <p className="px-2 mt-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Archived</p>
              {archivedClients.map((client) => <ClientRow key={client.id} client={client} dimmed />)}
            </>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-gray-200 space-y-1">
          <button
            onClick={openCreate}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Client
          </button>
          <Link
            href="/prompts"
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              pathname === '/prompts' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            Prompts
          </Link>
        </div>
      </aside>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div ref={modalRef} className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                {modalMode === 'edit' ? 'Edit Client' : 'New Client'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input name="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                  <input name="company_name" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Main Framework</label>
                <input name="main_framework" type="text" value={mainFramework} onChange={(e) => setMainFramework(e.target.value)} placeholder="e.g. The Four C's" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Brand Voice</label>
                <textarea name="brand_voice" value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} placeholder="e.g. Direct, confident, no jargon" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  {CLIENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : modalMode === 'edit' ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
