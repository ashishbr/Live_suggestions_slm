import { useState, useRef, useCallback, useEffect } from 'react'
import { complete } from '../lib/groq'
import {
  DEFAULT_SETTINGS,
  getContextWindow,
  parseSuggestions,
} from '../lib/prompts'

/**
 * useSuggestions
 *
 * Manages suggestion batches. Each batch = { id, timestamp, items[] }.
 * Refreshes automatically every settings.refreshIntervalMs while recording.
 */
export function useSuggestions(transcriptLines, isRecording, apiKey, settings) {
  const [batches, setBatches]       = useState([])   // newest first
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState(null)
  const prevTranscriptRef           = useRef('')
  const timerRef                    = useRef(null)
  const lastBatchPreviewsRef        = useRef([])      // to avoid repeats

  const fullTranscript = transcriptLines.join('\n')

  // ── Core: generate one batch ─────────────────────────────────────────────
  const generateBatch = useCallback(async () => {
    if (!apiKey || !fullTranscript.trim()) return
    // Skip if nothing changed since last batch
    if (fullTranscript === prevTranscriptRef.current && batches.length > 0) return

    setError(null)
    setIsLoading(true)

    try {
      const recentLine = transcriptLines[transcriptLines.length - 1] || ''

      const previousHint = lastBatchPreviewsRef.current.length
        ? `\n\nPrevious suggestions already shown (do not repeat):\n${lastBatchPreviewsRef.current.map(p => `- ${p}`).join('\n')}`
        : ''

      const userMsg = `Most recent statement/question:\n"""\n${recentLine}\n"""${previousHint}\n\nGenerate 3 suggestions relevant ONLY to this latest statement.`

      const systemPrompt =
        settings?.suggestionsSystemPrompt ?? DEFAULT_SETTINGS.suggestionsSystemPrompt

      const raw = await complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
        apiKey,
        { temperature: 0.7, maxTokens: 600 }
      )

      const items = parseSuggestions(raw)
      if (items.length === 0) {
        setError('Could not parse suggestions. Check your API key or try again.')
        return
      }

      const batch = {
        id: Date.now(),
        timestamp: new Date(),
        items,
      }

      // Track previews to avoid repeats next cycle
      lastBatchPreviewsRef.current = items.map(i => i.preview)
      prevTranscriptRef.current = fullTranscript

      setBatches(prev => [batch, ...prev])
    } catch (err) {
      setError(`Suggestions error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, fullTranscript, batches.length, settings])

  // ── Auto-refresh timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isRecording) {
      clearInterval(timerRef.current)
      timerRef.current = null
      return
    }

    const interval = settings?.refreshIntervalMs ?? DEFAULT_SETTINGS.refreshIntervalMs
    timerRef.current = setInterval(generateBatch, interval)
    return () => clearInterval(timerRef.current)
  }, [isRecording, generateBatch, settings?.refreshIntervalMs])

  // ── Generate immediately when new transcript arrives ─────────────────────
  useEffect(() => {
    if (!apiKey || !fullTranscript.trim()) return
    if (fullTranscript !== prevTranscriptRef.current) {
      generateBatch()
    }
  }, [fullTranscript]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    batches,
    isLoading,
    error,
    refresh: generateBatch,
    clearError: () => setError(null),
  }
}
