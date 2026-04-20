const GROQ_BASE = 'https://api.groq.com/openai/v1'

export const MODELS = {
  transcription: 'whisper-large-v3',
  chat: 'llama-3.3-70b-versatile',
}

/**
 * Transcribe an audio blob via Groq Whisper Large V3
 */
export async function transcribeAudio(audioBlob, apiKey) {
  const ext = audioBlob.type.includes('mp4') ? 'mp4'
    : audioBlob.type.includes('ogg') ? 'ogg'
    : 'webm'
  const formData = new FormData()
  formData.append('file', audioBlob, `audio.${ext}`)
  formData.append('model', MODELS.transcription)
  formData.append('response_format', 'text')
  formData.append('language', 'en')

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Transcription failed: ${res.status}`)
  }

  const text = await res.text()
  return text.trim()
}

/**
 * Stream a chat completion from Groq
 * onChunk(delta: string) called for each token
 * Returns full accumulated text
 */
export async function streamCompletion(messages, apiKey, onChunk, signal) {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      model: MODELS.chat,
      messages,
      stream: true,
      temperature: 0.6,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Chat failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
    for (const line of lines) {
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content || ''
        if (delta) {
          full += delta
          onChunk(delta)
        }
      } catch {
        // malformed SSE line, skip
      }
    }
  }

  return full
}

/**
 * Non-streaming completion, returns full text
 */
export async function complete(messages, apiKey, opts = {}) {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELS.chat,
      messages,
      stream: false,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 800,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Completion failed: ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}
