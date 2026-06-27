import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geminiJSON } from '@/lib/gemini'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const TYPE_LABELS: Record<string, string> = {
  talk: 'keynote talk',
  webinar: 'webinar',
  sales_presentation: 'sales presentation',
  email_campaign: 'email campaign',
}

type OutlineResult = {
  executive_summary: string
  sections: { title: string; duration_minutes?: number; purpose: string; story?: string; key_points: string[]; transition?: string }[]
  cta_placement: string
  estimated_duration_minutes: number
  readiness_notes: string
  readiness_score: number
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, clientId } = await req.json()
    if (!projectId || !clientId) return NextResponse.json({ error: 'projectId and clientId required' }, { status: 400 })

    const supabase = db()
    const [clientRes, projectRes, frameworksRes, offersRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('frameworks').select('*').eq('client_id', clientId),
      supabase.from('offers').select('*').eq('client_id', clientId),
    ])

    if (!projectRes.data) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const project = projectRes.data
    const client = clientRes.data

    // Load attached stories with their roles
    const { data: projectStories } = await supabase
      .from('project_stories')
      .select('*, story:stories(*)')
      .eq('project_id', projectId)
      .order('position')

    const framework = frameworksRes.data?.find(f => f.id === project.primary_framework_id)
    const offer = offersRes.data?.find(o => o.id === project.offer_id)

    const storyList = (projectStories ?? []).map((ps: any) => {
      const s = ps.story
      return `- Role: ${ps.story_role ?? 'unassigned'} | Title: ${s.title} (${s.story_type ?? ''}) | One-liner: ${s.one_liner ?? ''}\n  Content: ${s.long_version?.slice(0, 200) ?? s.short_version?.slice(0, 200) ?? 'no content'}`
    }).join('\n\n') || 'No stories attached yet'

    const prompt = `You are an expert presentation coach and content strategist.

Create a detailed outline for the following ${TYPE_LABELS[project.project_type] ?? project.project_type}.

PROJECT DETAILS
Title: ${project.title}
Type: ${TYPE_LABELS[project.project_type] ?? project.project_type}
Speaker: ${client?.name ?? 'Unknown'}
Audience: ${project.audience ?? 'Not specified'}
Goal: ${project.goal ?? 'Not specified'}
Length: ${project.length_minutes ? `${project.length_minutes} minutes` : 'Not specified'}
Tone: ${project.tone ?? 'Not specified'}
CTA: ${project.cta ?? 'Not specified'}
${framework ? `Primary Framework: ${framework.name} — ${framework.description ?? ''}` : ''}
${offer ? `Linked Offer: ${offer.name} — ${offer.description ?? ''} | CTA: ${offer.cta ?? ''}` : ''}

ATTACHED STORIES
${storyList}

Create a complete, actionable outline. For each section, specify which story to use (if any), the purpose, key talking points, and transitions.

Also provide:
- A readiness score (0-100) based on how well the stories and setup support this project
- Readiness notes explaining what's strong and what's missing

Return JSON with exactly this structure:
{
  "executive_summary": "<2-3 sentences summarizing the overall arc and approach>",
  "sections": [
    {
      "title": "<section name>",
      "duration_minutes": <number or null>,
      "purpose": "<what this section accomplishes>",
      "story": "<story title to use, or null>",
      "key_points": ["<point 1>", "<point 2>"],
      "transition": "<how to move to the next section, or null>"
    }
  ],
  "cta_placement": "<when and how to deliver the call to action>",
  "estimated_duration_minutes": <total minutes>,
  "readiness_notes": "<what's strong, what's missing, specific recommendations>",
  "readiness_score": <0-100>
}`

    const outline = await geminiJSON<OutlineResult>(prompt)

    // Save to generated_assets
    const { data: existing } = await supabase
      .from('generated_assets')
      .select('id')
      .eq('project_id', projectId)
      .eq('asset_type', `${project.project_type}_outline`)
      .maybeSingle()

    let assetError
    if (existing) {
      const res = await supabase
        .from('generated_assets')
        .update({
          content: outline,
          plain_text: outline.executive_summary,
          model_used: 'gemini-2.0-flash',
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      assetError = res.error
    } else {
      const res = await supabase
        .from('generated_assets')
        .insert({
          client_id: clientId,
          project_id: projectId,
          asset_type: `${project.project_type}_outline`,
          title: `Outline — ${project.title}`,
          content: outline,
          plain_text: outline.executive_summary,
          model_used: 'gemini-2.0-flash',
          status: 'draft',
        })
      assetError = res.error
    }

    if (assetError) throw new Error(`DB error: ${assetError.message}`)

    // Update readiness score on the project
    await supabase
      .from('projects')
      .update({
        readiness_score: outline.readiness_score,
        readiness_notes: outline.readiness_notes,
      })
      .eq('id', projectId)

    return NextResponse.json({ success: true, outline })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
