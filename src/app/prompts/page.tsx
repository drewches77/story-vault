'use client'

import { useState } from 'react'

const EXTRACTION_PROMPT = `You are a story extraction assistant for The Authority Forge. Your job is to extract and structure a personal story from a client transcript or audio summary.

Extract the following fields and return them as a JSON object:

{
  "title": "A short, memorable title for the story (5–10 words)",
  "story_type": "One of: Origin, Identity, Failure, Discovery, Client, Credibility, Vision",
  "short_version": "A 2–3 sentence summary of the story. This is the punchy, social-ready version.",
  "long_version": "The full story with narrative arc: setup, conflict/tension, resolution, and lesson or takeaway. 150–300 words.",
  "core_lesson": "The single key insight or lesson the story teaches. One sentence.",
  "memorable_quote": "A direct quote or highly quotable line from the story. If none exists, write one that captures the essence.",
  "use_cases": ["keynote", "webinar", "sales call", "social post", "email", "podcast"],
  "tags": ["tag1", "tag2", "tag3"],

  "scores": {
    "clarity": <1–5>,
    "emotional_impact": <1–5>,
    "teaching_value": <1–5>,
    "authority_value": <1–5>,
    "sales_value": <1–5>,
    "relatability": <1–5>,
    "reusability": <1–5>,
    "overall_utility": <1–5>
  }
}

---

SCORING GUIDE

Rate each dimension from 1 (weak) to 5 (exceptional):

• Clarity (1–5): How clear and easy to follow is the story? Does it have a logical arc with a beginning, middle, and end? Is the lesson obvious?

• Emotional Impact (1–5): How emotionally resonant is the story? Does it create tension, vulnerability, humor, or inspiration? Would an audience feel something?

• Teaching Value (1–5): How well does the story illustrate a lesson, principle, or framework? Could it be used to teach something specific?

• Authority Value (1–5): How much does this story build credibility, expertise, or trust? Does it demonstrate results, experience, or hard-won wisdom?

• Sales Value (1–5): How well does this story support persuasion or conversion? Does it address objections, paint a transformation, or move someone toward a decision?

• Relatability (1–5): How relatable is this story to a broad audience? Would most people recognize the situation or feeling?

• Reusability (1–5): How versatile is this story across different contexts, formats, and audiences? Can it be used in a keynote, social post, email, and sales call?

• Overall Utility Score (1–5): Your overall rating for how useful this story is in the vault. This is NOT an average — it's your holistic judgment of how much this story should be used. A story can score high here even if one dimension is weak, as long as it's exceptional in the ways that matter most.

---

INSTRUCTIONS

1. Read the transcript or audio summary carefully.
2. Identify the most compelling story or moment.
3. Extract and write all fields above.
4. Score each dimension honestly. Avoid defaulting to 3 — use the full range.
5. Return only valid JSON. No markdown, no explanation outside the JSON.
6. If a field cannot be determined from the source material, use null.
7. For use_cases, only include contexts where this story would genuinely work well.
8. Tags should be 3–6 keywords that describe the story's themes (e.g., "resilience", "leadership", "failure", "client result").`

export default function PromptsPage() {
  const [copied, setCopied] = useState(false)

  async function copyPrompt() {
    await navigator.clipboard.writeText(EXTRACTION_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Prompts</h1>
        <p className="text-sm text-gray-500 mt-1">Reference prompts for manual AI workflows.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Story Extraction Prompt</h2>
            <p className="text-xs text-gray-400 mt-0.5">Paste this into ChatGPT or Claude along with a transcript to extract and score a story.</p>
          </div>
          <button
            onClick={copyPrompt}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy Prompt
              </>
            )}
          </button>
        </div>
        <pre className="px-5 py-4 text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono bg-gray-50">
          {EXTRACTION_PROMPT}
        </pre>
      </div>

      <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4">
        <p className="text-xs font-medium text-indigo-800 mb-1">How to use</p>
        <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
          <li>Copy the prompt above.</li>
          <li>Open ChatGPT or Claude in a new chat.</li>
          <li>Paste the prompt, then paste the client transcript or audio summary below it.</li>
          <li>Copy the returned JSON and paste it into the story import form (coming soon) or manually fill in the story fields.</li>
        </ol>
      </div>
    </main>
  )
}
