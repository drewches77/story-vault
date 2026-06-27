'use client'

import { useRef, useState } from 'react'
import { downloadTemplate, parseFile } from '@/lib/import'
import type { ImportRow } from '@/lib/import'
import { createClient } from '@/lib/supabase'

type Props = {
  vaultId: string
  onClose: () => void
  onDone: () => void
}

export default function ImportModal({ vaultId, onClose, onDone }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const [done, setDone] = useState(false)

  const errorRows = rows.filter((r) => r._errors.length > 0)
  const validRows = rows.filter((r) => r._errors.length === 0)

  async function handleFile(file: File) {
    setParsing(true)
    setRows([])
    setFileName(file.name)
    try {
      const parsed = await parseFile(file)
      setRows(parsed)
    } catch {
      alert('Could not parse file. Make sure it is a valid .xlsx or .csv file.')
    }
    setParsing(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    if (!validRows.length) return
    setImporting(true)
    let count = 0

    for (const row of validRows) {
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

    setImported(count)
    setImporting(false)
    setDone(true)
  }

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

              {/* Validation errors */}
              {errorRows.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-red-700 mb-1">{errorRows.length} row{errorRows.length > 1 ? 's' : ''} with errors (will be skipped)</p>
                  <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                    {errorRows.map((r, i) => (
                      <li key={i}><span className="font-medium">{r.title || `Row ${i + 1}`}:</span> {r._errors.join(', ')}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview */}
              {rows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Preview — {validRows.length} valid {validRows.length === 1 ? 'story' : 'stories'} ready to import
                  </p>
                  <div className="space-y-2">
                    {validRows.slice(0, 5).map((row, i) => (
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
                    {validRows.length > 5 && (
                      <p className="text-xs text-gray-400 text-center">+ {validRows.length - 5} more</p>
                    )}
                  </div>
                </div>
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
              disabled={validRows.length === 0 || importing}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {importing ? `Importing…` : `Import ${validRows.length} ${validRows.length === 1 ? 'Story' : 'Stories'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
