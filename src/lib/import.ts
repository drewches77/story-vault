import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { saveAs } from 'file-saver'
import { STORY_TYPES, USE_CASES, STORY_STATUSES } from './types'

export const TEMPLATE_COLUMNS = [
  'title',
  'story_type',
  'status',
  'one_liner',
  'short_version',
  'long_version',
  'quotes',
  'use_cases',
  'clarity_score',
  'emotional_impact_score',
  'tags',
] as const

export type ImportRow = {
  title: string
  story_type: string
  status: string
  one_liner: string
  short_version: string
  long_version: string
  quotes: string
  use_cases: string
  clarity_score: string
  emotional_impact_score: string
  tags: string
  _errors: string[]
}

const EXAMPLE_ROW = {
  title: 'Lost the deal, learned the lesson',
  story_type: 'Failure',
  status: 'raw',
  one_liner: 'The $200k deal that fell apart and changed how I sell forever.',
  short_version: 'We were 3 weeks from close when the client went silent. I learned that assuming urgency is the fastest way to lose a deal.',
  long_version: '',
  quotes: '"I thought we had it locked. We didn\'t."',
  use_cases: 'sales_call, podcast',
  clarity_score: '4',
  emotional_impact_score: '5',
  tags: 'sales, failure, mindset',
}

export function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  const ws = XLSX.utils.json_to_sheet([EXAMPLE_ROW], { header: TEMPLATE_COLUMNS as unknown as string[] })

  // Column widths
  ws['!cols'] = [
    { wch: 30 }, // title
    { wch: 14 }, // story_type
    { wch: 12 }, // status
    { wch: 50 }, // one_liner
    { wch: 60 }, // short_version
    { wch: 60 }, // long_version
    { wch: 40 }, // quotes
    { wch: 30 }, // use_cases
    { wch: 14 }, // clarity_score
    { wch: 22 }, // emotional_impact_score
    { wch: 30 }, // tags
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Stories')

  // Add a Notes sheet explaining valid values
  const notes = XLSX.utils.aoa_to_sheet([
    ['Field', 'Required', 'Valid Values / Notes'],
    ['title', 'Yes', 'Any text'],
    ['story_type', 'No', STORY_TYPES.join(', ')],
    ['status', 'No', STORY_STATUSES.join(', ') + '  (defaults to "raw")'],
    ['one_liner', 'No', 'Single sentence'],
    ['short_version', 'No', '2–4 sentences'],
    ['long_version', 'No', 'Full narrative'],
    ['quotes', 'No', 'Verbatim quotes'],
    ['use_cases', 'No', 'Comma-separated: ' + USE_CASES.join(', ')],
    ['clarity_score', 'No', '1, 2, 3, 4, or 5'],
    ['emotional_impact_score', 'No', '1, 2, 3, 4, or 5'],
    ['tags', 'No', 'Comma-separated keywords'],
  ])
  notes['!cols'] = [{ wch: 24 }, { wch: 10 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, notes, 'Notes')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'StoryVault-Import-Template.xlsx')
}

function validateRow(raw: Record<string, string>, index: number): ImportRow {
  const errors: string[] = []
  const title = raw['title']?.trim() ?? ''
  if (!title) errors.push('Title is required')

  const storyType = raw['story_type']?.trim() ?? ''
  if (storyType && !STORY_TYPES.includes(storyType as any)) {
    errors.push(`Invalid story_type "${storyType}" — must be one of: ${STORY_TYPES.join(', ')}`)
  }

  const status = raw['status']?.trim() || 'raw'
  if (!STORY_STATUSES.includes(status as any)) {
    errors.push(`Invalid status "${status}" — must be one of: ${STORY_STATUSES.join(', ')}`)
  }

  const clarityScore = raw['clarity_score']?.trim() ?? ''
  if (clarityScore && (isNaN(Number(clarityScore)) || Number(clarityScore) < 1 || Number(clarityScore) > 5)) {
    errors.push('clarity_score must be 1–5')
  }

  const emotionalScore = raw['emotional_impact_score']?.trim() ?? ''
  if (emotionalScore && (isNaN(Number(emotionalScore)) || Number(emotionalScore) < 1 || Number(emotionalScore) > 5)) {
    errors.push('emotional_impact_score must be 1–5')
  }

  return {
    title,
    story_type: storyType,
    status,
    one_liner: raw['one_liner']?.trim() ?? '',
    short_version: raw['short_version']?.trim() ?? '',
    long_version: raw['long_version']?.trim() ?? '',
    quotes: raw['quotes']?.trim() ?? '',
    use_cases: raw['use_cases']?.trim() ?? '',
    clarity_score: clarityScore,
    emotional_impact_score: emotionalScore,
    tags: raw['tags']?.trim() ?? '',
    _errors: errors,
  }
}

export function parseFile(file: File): Promise<ImportRow[]> {
  const isCSV = file.name.toLowerCase().endsWith('.csv')

  if (isCSV) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target!.result as string
          const result = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: true,
          })
          resolve(result.data.map((row, i) => validateRow(row, i)))
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        resolve(rows.map((row, i) => validateRow(row, i)))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
