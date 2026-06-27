import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geminiJSON } from '@/lib/gemini'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type StrategyResult = {
  positioning_summary: string
  content_pillars: { name: string; description: string; stories: string[] }[]
  platform_strategy: { linkedin?: string; instagram?: string; twitter?: string; [key: string]: string | undefined }
  story_recommendations: { story_title: string; recommended_use: string; suggested_hook: string }[]
  content_gaps: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json()
    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

    const supabase = db()
    const [clientRes, vaultRes, frameworksRes, offersRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('story_vaults').select('id').eq('client_id', clientId).maybeSingle(),
      supabase.from('frameworks').select('*').eq('client_id', clientId).neq('status', 'archived'),
      supabase.from('offers').select('*').eq('client_id', clientId).neq('status', 'archived'),
    ])

    if (!clientRes.data) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    const client = clientRes.data

    let stories: any[] = []
    if (vaultRes.data) {
      const { data } = await supabase
        .from('stories')
        .select('title, story_type, one_liner, long_version, use_cases, status')
        .eq('vault_id', vaultRes.data.id)
        .neq('status', 'raw')
      stories = data ?? []
    }

    const frameworks = frameworksRes.data ?? []
    const offers = offersRes.data ?? []

    const storyList = stories.map(s =>
      `- ${s.title} (${s.story_type ?? 'untyped'}): ${s.one_liner ?? s.long_version?.slice(0, 100) ?? 'no summary'}`
    ).join('\n')

    const frameworkList = frameworks.map(f =>
      `- ${f.name} (${f.framework_type ?? 'other'}): ${f.description ?? 'no description'}`
    ).join('\n') || 'None on file'

    const offerList = offers.map(o =>
      `- ${o.name}${o.price ? ` | ${o.price}` : ''}: ${o.description ?? ''} | Problem: ${o.problem_solved ?? ''} | Promise: ${o.promise ?? ''}`
    ).join('\n') || 'None on file'

    const prompt = `You are a social media strategist for thought leaders, professional speakers, and coaches.

Build a complete social media strategy for the following client based on their story vault, frameworks, and offers.

CLIENT
Name: ${client.name}
Brand Voice: ${client.brand_voice || 'Not specified'}
Main Framework: ${client.main_framework || 'Not specified'}

STORY VAULT (${stories.length} stories)
${storyList || 'No stories yet'}

TEACHING FRAMEWORKS
${frameworkList}

OFFERS & PRODUCTS
${offerList}

Return JSON with exactly this structure:
{
  "positioning_summary": "<2-3 sentences: who they are, who they serve, what makes them distinct>",
  "content_pillars": [
    { "name": "<pillar name>", "description": "<what content fits here>", "stories": ["<story title>", ...] }
  ],
  "platform_strategy": {
    "linkedin": "<specific strategy and content cadence for LinkedIn>",
    "instagram": "<specific strategy and content cadence for Instagram>"
  },
  "story_recommendations": [
    { "story_title": "<title>", "recommended_use": "<where/how to use it>", "suggested_hook": "<opening line or hook>" }
  ],
  "content_gaps": ["<topics or story types they're missing>"]
}

Include 3-5 content pillars and recommendations for the top 3-5 most impactful stories.`

    const strategy = await geminiJSON<StrategyResult>(prompt)

    // Upsert into generated_assets
    const { data: existing } = await supabase
      .from('generated_assets')
      .select('id')
      .eq('client_id', clientId)
      .eq('asset_type', 'social_strategy')
      .maybeSingle()

    let assetError
    if (existing) {
      const res = await supabase
        .from('generated_assets')
        .update({
          content: strategy,
          plain_text: strategy.positioning_summary,
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
          asset_type: 'social_strategy',
          title: `Social Strategy — ${client.name}`,
          content: strategy,
          plain_text: strategy.positioning_summary,
          model_used: 'gemini-2.0-flash',
          status: 'draft',
        })
      assetError = res.error
    }

    if (assetError) throw new Error(`DB error: ${assetError.message}`)

    return NextResponse.json({ success: true, strategy })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
