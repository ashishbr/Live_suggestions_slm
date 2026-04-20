# TwinMind — Live Suggestions

A real-time meeting copilot that transcribes your microphone, surfaces three context-aware suggestions every 15 seconds, and lets you explore any suggestion in a detailed chat panel.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast HMR, CSS Modules for scoped styles, no unnecessary complexity |
| Transcription | Groq Whisper Large V3 | Fastest available Whisper endpoint; < 1s for a 30s chunk |
| LLM (chat / detail) | `llama-3.3-70b-versatile` on Groq | High-quality responses for chat and expanded suggestion answers |
| LLM (suggestions) | `llama-3.1-8b-instant` on Groq | Fastest Groq model; low latency for the frequent 15s suggestion cycle |
| Deployment | Vercel | Zero-config, instant deploys from GitHub |
| Storage | `localStorage` only | API key + settings only. No backend, no database needed |

---

## Setup

```bash
git clone <repo>
cd twinmind-live-suggestions
npm install
npm run dev          # http://localhost:3000
```

On first load you'll be prompted to paste a Groq API key (get one free at https://console.groq.com/keys). The key is stored only in your browser's `localStorage` and is never sent anywhere except directly to Groq.

### Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard — it auto-detects Vite.

---

## Architecture

```
src/
├── lib/
│   ├── groq.js        # Groq API client: transcribeAudio(), streamCompletion(), complete()
│   ├── prompts.js     # All prompts, DEFAULT_SETTINGS, getContextWindow(), parseSuggestions()
│   └── export.js      # exportSession() → JSON, exportSessionText() → TXT
├── hooks/
│   ├── useAudioRecorder.js   # MediaRecorder, 30s chunks → Whisper
│   ├── useSuggestions.js     # Auto-refresh timer, batch management, dedup
│   └── useChat.js            # Streaming chat, suggestion click handler
├── components/
│   ├── ApiKeyGate.*          # First-run key entry screen
│   ├── TranscriptPanel.*     # Left column: mic + transcript
│   ├── SuggestionsPanel.*    # Middle column: suggestion cards with pagination
│   ├── ChatPanel.*           # Right column: streaming chat
│   ├── PanelPrimitives.*     # Shared ErrorBanner + EmptyState components
│   └── SettingsModal.*       # Full prompt + context-window editor
└── App.jsx                   # Layout, wires all hooks together
```

---

## Prompt Strategy

### Suggestion generation

**Context window:** Only the most recently transcribed chunk (one ~30s audio segment). This makes suggestions laser-focused on what was just said, avoiding irrelevant suggestions based on earlier parts of the conversation.

**Suggestion types** the model can choose from:
- `question` — a sharp follow-up the listener should ask
- `talking_point` — an insight, angle, or supporting fact worth raising
- `answer` — a direct answer to a question just posed in the transcript
- `fact_check` — verification or correction of a dubious factual claim
- `clarify` — helpful background context on something just mentioned

**Priority order** baked into the prompt: answering open questions beats fact-checking beats follow-up questions beats talking points beats clarifications. This mirrors what's most urgent in a live conversation.

**Format:** We ask for strict JSON (`[{type, preview, detail_hint}]`) rather than prose, making parsing deterministic. If JSON is malformed, we surface an error rather than silently showing garbage.

**Deduplication:** The previous batch's previews are injected into the next prompt to prevent the model from recycling the same suggestion.

**Preview rule:** ≤12 words, independently useful. The preview alone should deliver value — clicking is for depth, not for the basic answer.

### Detail answers (on suggestion click)

Uses a larger context window (~1200 words) and a separate system prompt optimised for depth, structure, and grounding the answer in the conversation. The suggestion's `detail_hint` is included as a prompt scaffold so the model knows what angle to take.

### Chat

Full rolling transcript (last ~2000 words) is included in the system prompt. Responses are streamed token-by-token so the first token appears in < 400ms on Groq.

---

## Tradeoffs & Decisions

**No backend.** All API calls are made directly from the browser to Groq. This means the API key is visible in browser memory if someone inspects it, but for a personal tool with zero data to protect, this is the right tradeoff. The assignment says "no data persistence needed when reloading the page" and we honour that.

**30s MediaRecorder chunks.** We collect audio with `ondataavailable` every 1 second but only flush to Whisper every 30 seconds (configurable). Shorter chunks produce worse transcription because Whisper performs poorly on very short audio — it has no sentence context. 30s is the sweet spot for quality vs. latency.

**Suggestion pagination.** Only one batch is shown at a time. Use the ‹ › arrows in the header to navigate between batches, with a counter showing position (e.g. 2/4). New batches auto-jump the view to the latest. This keeps the panel clean while still letting you revisit earlier suggestions.

**Manual flush before refresh.** When the user hits the refresh button, we first flush any buffered audio to Whisper, then generate suggestions against the now-current transcript. This avoids stale suggestions when manually refreshing mid-conversation.

**CSS Modules over Tailwind.** No build-time Tailwind config needed; scoped styles mean zero cascade issues; easier to read the actual CSS values when reviewing code.

---

## Settings (all editable in-app)

| Setting | Default | Description |
|---|---|---|
| Suggestions context | 600 words | Transcript words passed to suggestion LLM |
| Detail context | 1200 words | Transcript words passed on suggestion click |
| Chat context | 2000 words | Transcript words in chat system prompt |
| Auto-refresh interval | 15000 ms | How often suggestions auto-refresh |
| Suggestions system prompt | (see prompts.js) | Full prompt controlling suggestion quality |
| Detail system prompt | (see prompts.js) | Prompt for expanded click-through answers |
| Chat system prompt | (see prompts.js) | Prompt for the chat panel |

---

## Export format

Clicking **JSON** exports a structured object:

```json
{
  "exportedAt": "...",
  "transcript": [{ "chunkIndex": 1, "text": "..." }],
  "suggestionBatches": [{
    "timestamp": "...",
    "suggestions": [{ "type": "question", "preview": "...", "detailHint": "..." }]
  }],
  "chat": [{ "role": "user", "content": "...", "timestamp": "...", "fromSuggestion": false }]
}
```

Clicking **TXT** exports a human-readable plain text version of the same data.
