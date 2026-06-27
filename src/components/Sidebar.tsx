'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Client } from '@/lib/types'
import { CLIENT_STATUSES } from '@/lib/types'

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-400',
  paused: 'bg-amber-400',
  archived: 'bg-gray-300',
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<Client[]>([])
  const [showModal, setShowModal] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [mainFramework, setMainFramework] = useState('')
  const [brandVoice, setBrandVoice] = useState('')
  const [status, setStatus] = useState('active')
  const [saving, setSaving] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })
    if (data) setClients(data)
  }

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowModal(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    const { data, error } = await supabase
      .from('clients')
      .insert({ name, email: email || null, company_name: companyName || null, main_framework: mainFramework || null, brand_voice: brandVoice || null, status })
      .select()
      .single()

    setSaving(false)
    if (error || !data) return

    setShowModal(false)
    resetForm()
    await loadClients()
    router.push(`/clients/${data.id}`)
  }

  function resetForm() {
    setName(''); setEmail(''); setCompanyName(''); setMainFramework(''); setBrandVoice(''); setStatus('active')
  }

  const activeClients = clients.filter((c) => c.status !== 'archived')
  const archivedClients = clients.filter((c) => c.status === 'archived')

  return (
    <>
      <aside className="w-60 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/af-icon.png" alt="Authority Forge" width={28} height={28} className="shrink-0" />
            <span className="font-semibold text-gray-900 text-sm tracking-tight">Story Vault</span>
          </Link>
        </div>

        {/* Client list */}
        <nav className="flex-1 px-2 py-3">
          <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Clients</p>
          {activeClients.length === 0 && (
            <p className="px-2 text-xs text-gray-400 py-2">No clients yet.</p>
          )}
          {activeClients.map((client) => {
            const active = pathname === `/clients/${client.id}`
            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors group ${
                  active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[client.status] ?? 'bg-gray-300'}`} />
                <span className="truncate">{client.name}</span>
              </Link>
            )
          })}

          {archivedClients.length > 0 && (
            <>
              <p className="px-2 mt-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Archived</p>
              {archivedClients.map((client) => {
                const active = pathname === `/clients/${client.id}`
                return (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-300" />
                    <span className="truncate">{client.name}</span>
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* New client */}
        <div className="px-3 py-3 border-t border-gray-200">
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Client
          </button>
        </div>
      </aside>

      {/* New Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div ref={modalRef} className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">New Client</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Main Framework</label>
                <input type="text" value={mainFramework} onChange={(e) => setMainFramework(e.target.value)} placeholder="e.g. The Four C's" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Brand Voice</label>
                <textarea value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} placeholder="e.g. Direct, confident, no jargon" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  {CLIENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
