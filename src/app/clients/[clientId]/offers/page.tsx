'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Client, Offer } from '@/lib/types'
import { OFFER_STATUSES } from '@/lib/types'
import ClientTabNav from '@/components/ClientTabNav'
import DropdownMenu from '@/components/DropdownMenu'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-gray-100 text-gray-500',
  archived: 'bg-gray-100 text-gray-400',
}

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  audience: '',
  problem_solved: '',
  promise: '',
  cta: '',
  status: 'draft',
}

export default function OffersPage() {
  const params = useParams()
  const clientId = params.clientId as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Offer | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [clientRes, offersRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('offers').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ])
    if (clientRes.data) setClient(clientRes.data)
    if (offersRes.data) setOffers(offersRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [clientId])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(offer: Offer) {
    setEditing(offer)
    setForm({
      name: offer.name,
      description: offer.description ?? '',
      price: offer.price ?? '',
      audience: offer.audience ?? '',
      problem_solved: offer.problem_solved ?? '',
      promise: offer.promise ?? '',
      cta: offer.cta ?? '',
      status: offer.status,
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function saveOffer(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      client_id: clientId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price.trim() || null,
      audience: form.audience.trim() || null,
      problem_solved: form.problem_solved.trim() || null,
      promise: form.promise.trim() || null,
      cta: form.cta.trim() || null,
      status: form.status,
    }

    if (editing) {
      const { error } = await supabase.from('offers').update(payload).eq('id', editing.id)
      if (error) { alert(`Error updating offer: ${error.message}`); setSaving(false); return }
    } else {
      const { error } = await supabase.from('offers').insert(payload)
      if (error) { alert(`Error creating offer: ${error.message}`); setSaving(false); return }
    }

    setSaving(false)
    cancelForm()
    load()
  }

  async function deleteOffer(offer: Offer) {
    if (!confirm(`Delete "${offer.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('offers').delete().eq('id', offer.id)
    if (error) { alert(`Error deleting offer: ${error.message}`); return }
    load()
  }

  async function toggleArchive(offer: Offer) {
    const next = offer.status === 'archived' ? 'draft' : 'archived'
    const { error } = await supabase.from('offers').update({ status: next }).eq('id', offer.id)
    if (error) { alert(`Error updating offer: ${error.message}`); return }
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const active = offers.filter(o => o.status !== 'archived')
  const archived = offers.filter(o => o.status === 'archived')

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
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{editing ? 'Edit Offer' : 'New Offer'}</h2>
          <form onSubmit={saveOffer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Offer Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Keynote Speaker Package"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Price / Range</label>
                <input
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. $5,000–$15,000"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {OFFER_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Audience</label>
                <input
                  value={form.audience}
                  onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                  placeholder="Who is this for?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What is included in this offer?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Problem Solved</label>
                <textarea
                  rows={2}
                  value={form.problem_solved}
                  onChange={e => setForm(f => ({ ...f, problem_solved: e.target.value }))}
                  placeholder="What pain does this solve?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Promise / Outcome</label>
                <textarea
                  rows={2}
                  value={form.promise}
                  onChange={e => setForm(f => ({ ...f, promise: e.target.value }))}
                  placeholder="What result does the client get?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Call to Action</label>
                <input
                  value={form.cta}
                  onChange={e => setForm(f => ({ ...f, cta: e.target.value }))}
                  placeholder="e.g. Book a discovery call at calendly.com/…"
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
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Offer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{active.length} active offer{active.length !== 1 ? 's' : ''}</p>
        {!showForm && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Offer
          </button>
        )}
      </div>

      {/* Offers list */}
      {offers.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No offers yet</p>
          <p className="text-xs text-gray-400">Add your client's products, services, and speaking packages.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(offer => (
            <OfferCard key={offer.id} offer={offer} onEdit={openEdit} onArchive={toggleArchive} onDelete={deleteOffer} />
          ))}
          {archived.length > 0 && (
            <details className="group">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 py-2 select-none">
                {archived.length} archived
              </summary>
              <div className="space-y-3 mt-2">
                {archived.map(offer => (
                  <OfferCard key={offer.id} offer={offer} onEdit={openEdit} onArchive={toggleArchive} onDelete={deleteOffer} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </main>
  )
}

function OfferCard({
  offer,
  onEdit,
  onArchive,
  onDelete,
}: {
  offer: Offer
  onEdit: (o: Offer) => void
  onArchive: (o: Offer) => void
  onDelete: (o: Offer) => void
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-4 ${offer.status === 'archived' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{offer.name}</h3>
            {offer.price && (
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{offer.price}</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[offer.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {offer.status}
            </span>
          </div>

          {offer.audience && (
            <p className="text-xs text-gray-500 mb-1">For: {offer.audience}</p>
          )}

          {offer.description && (
            <p className="text-sm text-gray-600 mb-2">{offer.description}</p>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {offer.problem_solved && (
              <div>
                <p className="text-xs font-medium text-gray-500">Problem</p>
                <p className="text-xs text-gray-700">{offer.problem_solved}</p>
              </div>
            )}
            {offer.promise && (
              <div>
                <p className="text-xs font-medium text-gray-500">Promise</p>
                <p className="text-xs text-gray-700">{offer.promise}</p>
              </div>
            )}
          </div>

          {offer.cta && (
            <p className="text-xs text-indigo-600 mt-2 font-medium">{offer.cta}</p>
          )}
        </div>
        <DropdownMenu
          items={[
            { label: 'Edit', onClick: () => onEdit(offer) },
            { label: offer.status === 'archived' ? 'Unarchive' : 'Archive', onClick: () => onArchive(offer) },
            { label: 'Delete', onClick: () => onDelete(offer), destructive: true },
          ]}
        />
      </div>
    </div>
  )
}
