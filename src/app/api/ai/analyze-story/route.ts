import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geminiJSON } from '@/lib/gemini'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type ScoreResult = {
  clarity_score: number
  emotional_impact_score: number
  teaching_value_score: number
  authority_value_score: number
  sales_value_score: number
  relatability_score: number
  reusability_score: number
  analysis_notes: string
}

export async function POST(req: NextRequest) {
  try {
    const { storyId } = await req.json()
    if (!storyId) return NextResponse.json({ error: 'storyId required' }, { status: 400 })

    const supabase = db()
    const { data: story, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .single()

    if (error || !story) return NextResponse.json({ error: 'Story not found' }, { status: 404 })

    const content = story.long_version || story.transcription || story.short_version || story.one_liner || ''
    if (!content.trim()) {
      return NextResponse.json({ error: 'Story has no content to analyze. Add a transcription, long version, or one-liner first.' }, { status: 400 })
    }

    const prompt = `You are an expert story coach for professional speakers and thought leaders.

Analyze the following story and score it on 7 dimensions (each 1–5) with 5 being excellent.

Story Title: ${story.title}
Story Type: ${story.story_type || 'Not specified'}
Content:
${content}

Score definitions:
- clarity_score: How clear and easy to follow is the story arc?
- emotional_impact_score: How emotionally resonant and memorable is it?
- teaching_value_score: How well does it illustrate a lesson or principle?
- authority_value_score: How much does it establish credibility and expertise?
- sales_value_score: How well does it support selling or persuading?
- relatability_score: How relatable is it to a broad professional audience?
- reusability_score: How versatile is it across different contexts (talks, podcasts, social, email)?

Return JSON with exactly this structure:
{
  "clarity_score": <1-5>,
  "emotional_impact_score": <1-5>,
  "teaching_value_score": <1-5>,
  "authority_value_score": <1-5>,
  "sales_value_score": <1-5>,
  "relatability_score": <1-5>,
  "reusability_score": <1-5>,
  "analysis_notes": "<2-4 sentences: key strengths, one specific improvement suggestion>"
}`

    const scores = await geminiJSON<ScoreResult>(prompt)

    // Upsert into story_scores
    const { error: upsertError } = await supabase
      .from('story_scores')
      .upsert({
        story_id: storyId,
        clarity_score: scores.clarity_score,
        emotional_impact_score: scores.emotional_impact_score,
        teaching_value_score: scores.teaching_value_score,
        authority_value_score: scores.authority_value_score,
        sales_value_score: scores.sales_value_score,
        relatability_score: scores.relatability_score,
        reusability_score: scores.reusability_score,
        analysis_notes: scores.analysis_notes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'story_id' })

    if (upsertError) throw new Error(`DB error: ${upsertError.message}`)

    // Also update stories table so clarity/emotional dots refresh immediately
    await supabase
      .from('stories')
      .update({
        clarity_score: scores.clarity_score,
        emotional_impact_score: scores.emotional_impact_score,
      })
      .eq('id', storyId)

    return NextResponse.json({ success: true, scores })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
