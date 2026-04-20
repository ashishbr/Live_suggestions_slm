/**
 * Default prompts & tunable settings.
 * All of these are surfaced in the Settings panel so the user can override them.
 *
 * PROMPT STRATEGY
 * ───────────────
 * Suggestions prompt: short context window (~last 600 words) to keep latency low.
 * We ask for exactly 3 JSON objects so parsing is deterministic.
 * Each suggestion has: type, preview (≤12 words, immediately useful), detail_hint.
 *
 * Detail prompt: larger window (~last 1200 words) so the answer is fully grounded.
 *
 * Chat prompt: full rolling transcript so follow-up Qs work well.
 *
 * Suggestion types we allow the model to choose from:
 *   question    – a smart question the user could ask right now
 *   talking_point – a point worth raising / elaborating on
 *   answer      – an answer to a question that was just asked
 *   fact_check  – verification or correction of something claimed
 *   clarify     – background info that explains something mentioned
 */

export const DEFAULT_SETTINGS = {
  // ── Model context windows (in words, approx) ──────────────────────────────
  suggestionsContextWords: 600,
  detailContextWords: 1200,
  chatContextWords: 2000,

  // ── Refresh interval (ms) ─────────────────────────────────────────────────
  refreshIntervalMs: 30000,

  // ── Prompts ───────────────────────────────────────────────────────────────

  suggestionsSystemPrompt: `You are an expert real-time meeting copilot. Given a live conversation transcript, generate exactly 3 contextually intelligent suggestions that would help the listener RIGHT NOW.

Choose the most useful TYPE for each suggestion from:
- "question": A sharp, specific question the listener could ask to advance the discussion
- "talking_point": An insight, angle, or supporting point worth surfacing
- "answer": A direct answer to a question that was just posed in the transcript  
- "fact_check": A verification or gentle correction of a factual claim just made
- "clarify": Helpful background context that explains something just mentioned

Rules:
1. Each suggestion must be different in type where possible — variety beats repetition.
2. The "preview" must be ≤12 words AND independently useful — someone should get value from reading it alone without clicking.
3. Base suggestions strictly on what was RECENTLY discussed, not generic meeting advice.
4. Pick the 3 most valuable things. Prioritise: answering questions just asked > fact-checking dubious claims > sharp follow-up questions > talking points > clarifications.
5. Never repeat a suggestion from a previous batch.

Respond ONLY with a JSON array of exactly 3 objects, no markdown, no commentary:
[
  {"type": "question"|"talking_point"|"answer"|"fact_check"|"clarify", "preview": "...", "detail_hint": "..."},
  {"type": "...", "preview": "...", "detail_hint": "..."},
  {"type": "...", "preview": "...", "detail_hint": "..."}
]`,

  detailSystemPrompt: `You are a knowledgeable meeting copilot giving a detailed, immediately useful answer based on the live conversation. 

When responding:
- Lead with the most important insight in the first sentence
- Be specific and concrete — cite numbers, names, examples from the transcript where relevant
- Structure clearly with short paragraphs or a brief list if it helps readability
- Keep it under 250 words unless the topic genuinely needs more depth
- End with one practical next step or implication if relevant

Ground your answer in the conversation context provided.`,

  chatSystemPrompt: `You are TwinMind, an AI meeting copilot. You have access to the live meeting transcript and help the user with anything related to the conversation.

Be direct, concise, and specific. Reference the transcript naturally when relevant. Answer questions, help with follow-ups, draft messages, summarise sections, or analyse anything discussed. 

If asked something outside the transcript, answer from general knowledge but note that it wasn't discussed in the meeting.`,
}

/**
 * Extract the last N words from a transcript for context windowing.
 */
export function getContextWindow(transcript, maxWords) {
  if (!transcript) return ''
  const words = transcript.trim().split(/\s+/)
  if (words.length <= maxWords) return transcript.trim()
  return '...' + words.slice(-maxWords).join(' ')
}

/**
 * Parse the suggestions JSON response, with fallback.
 */
export function parseSuggestions(raw) {
  try {
    // Strip potential markdown fences
    const clean = raw.replace(/```json|```/gi, '').trim()
    const arr = JSON.parse(clean)
    if (!Array.isArray(arr)) throw new Error('not array')
    return arr.slice(0, 3).map(s => ({
      type: s.type || 'talking_point',
      preview: s.preview || '',
      detail_hint: s.detail_hint || '',
    }))
  } catch {
    return []
  }
}

export const SUGGESTION_TYPE_META = {
  question:      { label: 'Question',      color: '#276fbf', bg: 'rgba(39,111,191,0.12)'  },
  talking_point: { label: 'Talking Point', color: '#f2f230', bg: 'rgba(242,242,48,0.10)'  },
  answer:        { label: 'Answer',        color: '#ffeef2', bg: 'rgba(255,238,242,0.08)' },
  fact_check:    { label: 'Fact Check',    color: '#df2935', bg: 'rgba(223,41,53,0.12)'   },
  clarify:       { label: 'Clarify',       color: '#5da0d6', bg: 'rgba(93,160,214,0.10)'  },
}
