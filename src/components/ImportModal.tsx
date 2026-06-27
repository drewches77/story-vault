'use client'

import { useRef, useState } from 'react'
import { downloadTemplate, parseFile } from '@/lib/import'
import type { ImportRow } from '@/lib/import'
import { createClient } from '@/lib/supabase'
import { STORY_TYPES } from '@/lib/types'

type JsonStoryRow = {
  title: string
  story_type: string
  short_version: string
  long_version: string
  one_liner: string
  quotes: string
  use_cases: string[]
  tags: string[]
  clarity_score: number | null
  emotional_impact_score: number | null
  teaching_value_score: number | null
  authority_value_score: number | null
  sales_value_score: number | null
  relatability_score: number | null
  reusability_score: number | null
  overall_utility_score: number | null
  _errors: string[]
}

type Props = {
  vaultId: string
  onClose: () => void
  onDone: () => void
}

function score(val: unknown): number | null {
  const n = Number(val)
  return val != null && !isNaN(n) && n >= 1 && n <= 5 ? n : null
}

function parseJsonInput(text: string): JsonStoryRow[] {
  const raw = JSON.parse(text)
  const items: unknown[] = Array.isArray(raw) ? raw : [raw]

  return items.map((item: any) => {
    const errors: string[] = []
    const title = String(item.title ?? '').trim()
    if (!title) errors.push('Title is required')

    const storyType = String(item.story_type ?? '').trim()
    if (storyType && !STORY_TYPES.includes(storyType as any)) {
      errors.push(`Invalid story_type "${storyType}"`)
    }

    return {
      title,
      story_type: storyType,
      short_version: String(item.short_version ?? '').trim(),
      long_version: String(item.long_version ?? '').trim(),
      one_liner: String(item.core_lesson ?? item.one_liner ?? '').trim(),
      quotes: String(item.memorable_quote ?? item.quotes ?? '').trim(),
      use_cases: Array.isArray(item.use_cases) ? item.use_cases.map(String) : [],
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      clarity_score: score(item.scores?.clarity ?? item.clarity_score),
      emotional_impact_score: score(item.scores?.emotional_impact ?? item.emotional_impact_score),
      teaching_value_score: score(item.scores?.teaching_value ?? item.teaching_value_score),
      authority_value_score: score(item.scores?.authority_value ?? item.authority_value_score),
      sales_value_score: score(item.scores?.sales_value ?? item.sales_value_score),
      relatability_score: score(item.scores?.relatability ?? item.relatability_score),
      reusability_score: score(item.scores?.reusability ?? item.reusability_score),
      overall_utility_score: score(item.scores?.overall_utility ?? item.overall_utility_score),
      _errors: errors,
    } satisfies JsonStoryRow
  })
}

export default function ImportModal({ vaultId, onClose, onDone }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<'json' | 'file'>('json')

  // JSON mode state
  const [jsonText, setJsonText] = useState('')
  const [jsonRows, setJsonRows] = useState<JsonStoryRow[]>([])
  const [jsonError, setJsonError] = useState('')

  // File mode state
  const [fileRows, setFileRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)

  // Shared state
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const [done, setDone] = useState(false)

  // --- JSON parsing ---
  function handleJsonChange(text: string) {
    setJsonText(text)
    setJsonError('')
    setJsonRows([])
    if (!text.trim()) return
    try {
      setJsonRows(parseJsonInput(text))
    } catch {
      setJsonError('Invalid JSON — paste the raw JSON output from the AI prompt.')
    }
  }

  const validJsonRows = jsonRows.filter(r => r._errors.length === 0)
  const errorJsonRows = jsonRows.filter(r => r._errors.length > 0)

  // --- File parsing ---
  async function handleFile(file: File) {
    setParsing(true)
    setFileRows([])
    setFileName(file.name)
    try {
      const parsed = await parseFile(file)
      setFileRows(parsed)
    } catch (err) {
      alert(`Could not parse file: ${err instanceof Error ? err.message : String(err)}`)
    }
    setParsing(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const validFileRows = fileRows.filter(r => r._errors.length === 0)
  const errorFileRows = fileRows.filter(r => r._errors.length > 0)

  // --- Import ---
  async function handleImport() {
    setImporting(true)
    let count = 0

    if (tab === 'json') {
      for (const row of validJsonRows) {
        const { data: storyData, error } = await supabase
          .from('stories')
          .insert({
            vault_id: vaultId,
            title: row.title,
            story_type: row.story_type || null,
            status: 'raw',
            one_liner: row.one_liner || null,
            short_version: row.short_version || null,
            long_version: row.long_version || null,
            quotes: row.quotes || null,
            use_cases: row.use_cases,
            clarity_score: row.clarity_score,
            emotional_impact_score: row.emotional_impact_score,
          })
          .select()
          .single()

        if (!error && storyData) {
          // Save all 7 scores to story_scores
          const hasScores = [
            row.clarity_score, row.emotional_impact_score, row.teaching_value_score,
            row.authority_value_score, row.sales_value_score, row.relatability_score,
            row.reusability_score,
          ].some(s => s != null)

          if (hasScores) {
            await supabase.from('story_scores').upsert({
              story_id: storyData.id,
              clarity_score: row.clarity_score,
              emotional_impact_score: row.emotional_impact_score,
              teaching_value_score: row.teaching_value_score,
              authority_value_score: row.authority_value_score,
              sales_value_score: row.sales_value_score,
              relatability_score: row.relatability_score,
              reusability_score: row.reusability_score,
              overall_utility_score: row.overall_utility_score,
            })
          }

          // Tags
          for (const tagName of row.tags) {
            if (!tagName) continue
            let { data: existingTag } = await supabase.from('tags').select('*').eq('name', tagName).maybeSingle()
            let tagId = existingTag?.id
            if (!tagId) {
              const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select().single()
              tagId = newTag?.id
            }
            if (tagId) await supabase.from('story_tags').insert({ story_id: storyData.id, tag_id: tagId })
          }

          count++
        }
      }
    } else {
      for (const row of validFileRows) {
        const { data: storyData, error } = await supabase
          .from('stories')
          .insert({
            vault_id: vaultId,
            title: row.title,
            story_type: row.story_type || null,
            status: row.status || 'raw',
            one_liner: row.one_liner || null,
            short_version: row.short_version || null,
            long_version: row.long_version || null,
            quotes: row.quotes || null,
            use_cases: row.use_cases
              ? row.use_cases.split(',').map((u) => u.trim()).filter(Boolean)
              : [],
            clarity_score: row.clarity_score ? parseInt(row.clarity_score) : null,
            emotional_impact_score: row.emotional_impact_score ? parseInt(row.emotional_impact_score) : null,
          })
          .select()
          .single()

        if (!error && storyData && row.tags) {
          const tagNames = row.tags.split(',').map((t) => t.trim()).filter(Boolean)
          for (const tagName of tagNames) {
            let { data: existingTag } = await supabase.from('tags').select('*').eq('name', tagName).maybeSingle()
            let tagId = existingTag?.id
            if (!tagId) {
              const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select().single()
              tagId = newTag?.id
            }
            if (tagId) await supabase.from('story_tags').insert({ story_id: storyData.id, tag_id: tagId })
          }
        }

        if (!error) count++
      }
    }

    setImported(count)
    setImporting(false)
    setDone(true)
  }

  const readyCount = tab === 'json' ? validJsonRows.length : validFileRows.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!importing ? onClose : undefined} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Import Stories</h2>
          <button onClick={onClose} disabled={importing} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {done ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">{imported} {imported === 1 ? 'story' : 'stories'} imported</p>
              <button onClick={() => { onDone(); onClose() }} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 text-sm">
                <button
                  onClick={() => setTab('json')}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${tab === 'json' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Paste JSON
                </button>
                <button
                  onClick={() => setTab('file')}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${tab === 'file' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Upload File
                </button>
              </div>

              {tab === 'json' ? (
                <>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-xs text-indigo-700">
                    Run the extraction prompt in ChatGPT or Claude, then paste the JSON output below. Accepts a single story object or an array of stories.
                  </div>

                  <textarea
                    value={jsonText}
                    onChange={e => handleJsonChange(e.target.value)}
                    placeholder={'{\n  "title": "...",\n  "story_type": "Failure",\n  ...\n}'}
                    rows={10}
                    className="w-full px-3 py-2.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-gray-700 bg-gray-50"
                  />

                  {jsonError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{jsonError}</p>
                  )}

                  {errorJsonRows.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <p className="text-sm font-medium text-red-700 mb-1">{errorJsonRows.length} {errorJsonRows.length === 1 ? 'story' : 'stories'} with errors (will be skipped)</p>
                      <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                        {errorJsonRows.map((r, i) => (
                          <li key={i}><span className="font-medium">{r.title || `Item ${i + 1}`}:</span> {r._errors.join(', ')}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validJsonRows.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Preview — {validJsonRows.length} {validJsonRows.length === 1 ? 'story' : 'stories'} ready to import
                      </p>
                      <div className="space-y-2">
                        {validJsonRows.map((row, i) => (
                          <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-800 truncate">{row.title}</p>
                              <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                                {row.story_type && (
                                  <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{row.story_type}</span>
                                )}
                                {row.overall_utility_score != null && (
                                  <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">Score: {row.overall_utility_score}/5</span>
                                )}
                              </div>
                            </div>
                            {row.one_liner && <p className="text-xs text-gray-500 mt-1 italic truncate">"{row.one_liner}"</p>}
                            {row.tags.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {row.tags.map((t, ti) => (
                                  <span key={ti} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Template download */}
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Download the template</p>
                      <p className="text-xs text-gray-500 mt-0.5">Fill it in, then upload it below. Accepts .xlsx or .csv.</p>
                    </div>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors shrink-0 ml-4"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Template
                    </button>
                  </div>

                  {/* File drop zone */}
                  <div
                    onDrop={onDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.csv"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                    />
                    {parsing ? (
                      <p className="text-sm text-gray-500">Parsing file…</p>
                    ) : fileName ? (
                      <p className="text-sm text-gray-700 font-medium">{fileName}</p>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <p className="text-sm text-gray-500">Drop your file here, or <span className="text-indigo-600 font-medium">browse</span></p>
                        <p className="text-xs text-gray-400 mt-1">.xlsx or .csv</p>
                      </>
                    )}
                  </div>

                  {errorFileRows.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <p className="text-sm font-medium text-red-700 mb-1">{errorFileRows.length} row{errorFileRows.length > 1 ? 's' : ''} with errors (will be skipped)</p>
                      <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                        {errorFileRows.map((r, i) => (
                          <li key={i}><span className="font-medium">{r.title || `Row ${i + 1}`}:</span> {r._errors.join(', ')}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {fileRows.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Preview — {validFileRows.length} valid {validFileRows.length === 1 ? 'story' : 'stories'} ready to import
                      </p>
                      <div className="space-y-2">
                        {validFileRows.slice(0, 5).map((row, i) => (
                          <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-800 truncate">{row.title}</p>
                              <div className="flex gap-1.5 shrink-0">
                                {row.story_type && (
                                  <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{row.story_type}</span>
                                )}
                                <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{row.status}</span>
                              </div>
                            </div>
                            {row.one_liner && <p className="text-xs text-gray-500 mt-1 italic truncate">"{row.one_liner}"</p>}
                          </div>
                        ))}
                        {validFileRows.length > 5 && (
                          <p className="text-xs text-gray-400 text-center">+ {validFileRows.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} disabled={importing} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={readyCount === 0 || importing}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {importing ? 'Importing…' : `Import ${readyCount} ${readyCount === 1 ? 'Story' : 'Stories'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
