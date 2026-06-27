import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'
import type { Story, Tag } from './types'

type StoryWithTags = Story & { tags: Tag[] }

function storySection(story: StoryWithTags): Paragraph[] {
  const paras: Paragraph[] = []

  paras.push(
    new Paragraph({
      text: story.title,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 120 },
    })
  )

  const meta: string[] = []
  if (story.story_type) meta.push(story.story_type)
  if (story.status) meta.push(story.status.replace(/_/g, ' '))
  if (meta.length > 0) {
    paras.push(
      new Paragraph({
        children: [new TextRun({ text: meta.join(' · '), color: '888888', size: 18 })],
        spacing: { after: 160 },
      })
    )
  }

  if (story.one_liner) {
    paras.push(
      new Paragraph({
        children: [new TextRun({ text: `"${story.one_liner}"`, italics: true, size: 22 })],
        spacing: { after: 200 },
      })
    )
  }

  if (story.short_version) {
    paras.push(
      new Paragraph({
        children: [new TextRun({ text: 'Short Version', bold: true, size: 20 })],
        spacing: { after: 80 },
      })
    )
    for (const line of story.short_version.split('\n')) {
      paras.push(new Paragraph({ text: line, spacing: { after: 80 } }))
    }
  }

  if (story.long_version) {
    paras.push(
      new Paragraph({
        children: [new TextRun({ text: 'Long Version', bold: true, size: 20 })],
        spacing: { before: 200, after: 80 },
      })
    )
    for (const line of story.long_version.split('\n')) {
      paras.push(new Paragraph({ text: line, spacing: { after: 80 } }))
    }
  }

  if (story.quotes) {
    paras.push(
      new Paragraph({
        children: [new TextRun({ text: 'Memorable Quotes', bold: true, size: 20 })],
        spacing: { before: 200, after: 80 },
      })
    )
    for (const line of story.quotes.split('\n')) {
      paras.push(new Paragraph({ text: line, spacing: { after: 80 } }))
    }
  }

  if (story.use_cases?.length > 0) {
    paras.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Best Use Cases: ', bold: true }),
          new TextRun({ text: story.use_cases.map((u) => u.replace(/_/g, ' ')).join(', ') }),
        ],
        spacing: { before: 200, after: 80 },
      })
    )
  }

  if (story.tags?.length > 0) {
    paras.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Tags: ', bold: true }),
          new TextRun({ text: story.tags.map((t) => t.name).join(', '), color: '555555' }),
        ],
        spacing: { after: 80 },
      })
    )
  }

  const scores: string[] = []
  if (story.clarity_score) scores.push(`Clarity: ${story.clarity_score}/5`)
  if (story.emotional_impact_score) scores.push(`Emotional Impact: ${story.emotional_impact_score}/5`)
  if (scores.length > 0) {
    paras.push(
      new Paragraph({
        children: [new TextRun({ text: scores.join('  ·  '), color: '888888', size: 18 })],
        spacing: { after: 80 },
      })
    )
  }

  // divider
  paras.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' } },
      spacing: { before: 200, after: 400 },
    })
  )

  return paras
}

export async function exportStoriesToDocx(
  clientName: string,
  stories: StoryWithTags[]
) {
  const children: Paragraph[] = [
    new Paragraph({
      text: `${clientName} — Story Vault`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Exported ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  ·  ${stories.length} stor${stories.length === 1 ? 'y' : 'ies'}`,
          color: '888888',
          size: 18,
        }),
      ],
      spacing: { after: 600 },
    }),
    ...stories.flatMap(storySection),
  ]

  const doc = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `${clientName.replace(/\s+/g, '-')}-Story-Vault.docx`
  saveAs(blob, filename)
}
