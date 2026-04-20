import { useState, useCallback, useRef } from 'react'
import { streamCompletion } from '../lib/groq'
import { DEFAULT_SETTINGS, getContextWindow } from '../lib/prompts'

/**
 * useChat
 *
 * Manages the chat panel. Messages are { role, content, timestamp }.
 * Supports both user-typed messages and suggestion click-throughs.
 */
export function useChat(transcriptLines, apiKey, settings) {
  const [messages, setMessages]   = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError]         = useState(null)
  const abortRef                  = useRef(null)

  const fullTranscript = transcriptLines.join('\n')

  const buildSystemMessage = useCallback(() => {
    const ctx = getContextWindow(
      fullTranscript,
      settings?.chatContextWords ?? DEFAULT_SETTINGS.chatContextWords
    )
    const base = settings?.chatSystemPrompt ?? DEFAULT_SETTINGS.chatSystemPrompt
    return ctx
      ? `${base}\n\n---\nCurrent meeting transcript:\n"""\n${ctx}\n"""`
      : base
  }, [fullTranscript, settings])

  /**
   * Send a message and stream the response.
   * If detailHint is provided, it's included as assistant context
   * (used when clicking a suggestion for a richer answer).
   */
  const sendMessage = useCallback(async (userText, detailHint = null) => {
    if (!apiKey || !userText.trim() || isStreaming) return
    setError(null)

    // Build the user content — if clicking a suggestion, include hint
    const content = detailHint
      ? `${userText}\n\n[Context hint for your answer: ${detailHint}]`
      : userText

    const userMsg = { role: 'user', content: userText, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])

    // Placeholder for streaming assistant message
    const assistantMsg = { role: 'assistant', content: '', timestamp: new Date() }
    setMessages(prev => [...prev, assistantMsg])

    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      // Build API messages: system + history + new user msg
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const apiMessages = [
        { role: 'system', content: buildSystemMessage() },
        ...history,
        { role: 'user', content },
      ]

      await streamCompletion(
        apiMessages,
        apiKey,
        delta => {
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + delta }
            }
            return updated
          })
        },
        abortRef.current.signal
      )
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(`Chat error: ${err.message}`)
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: `⚠ ${err.message}`,
          }
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [apiKey, isStreaming, messages, buildSystemMessage])

  /**
   * Called when user clicks a suggestion card.
   * Uses the detail system prompt for a richer, longer answer.
   */
  const sendSuggestionClick = useCallback(async (suggestion, transcriptForDetail) => {
    if (!apiKey || isStreaming) return
    setError(null)

    const ctx = getContextWindow(
      transcriptForDetail || fullTranscript,
      settings?.detailContextWords ?? DEFAULT_SETTINGS.detailContextWords
    )

    const userText = suggestion.preview
    const userMsg  = { role: 'user', content: userText, timestamp: new Date(), fromSuggestion: true }
    setMessages(prev => [...prev, userMsg])

    const assistantMsg = { role: 'assistant', content: '', timestamp: new Date() }
    setMessages(prev => [...prev, assistantMsg])

    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      const detailSystem =
        (settings?.detailSystemPrompt ?? DEFAULT_SETTINGS.detailSystemPrompt) +
        (ctx ? `\n\n---\nMeeting transcript context:\n"""\n${ctx}\n"""` : '')

      const apiMessages = [
        { role: 'system', content: detailSystem },
        {
          role: 'user',
          content: `Suggestion type: ${suggestion.type}\nQuery: ${suggestion.preview}\nHint: ${suggestion.detail_hint}\n\nPlease give a detailed, useful answer based on this meeting context.`,
        },
      ]

      await streamCompletion(
        apiMessages,
        apiKey,
        delta => {
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + delta }
            }
            return updated
          })
        },
        abortRef.current.signal
      )
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(`Chat error: ${err.message}`)
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [apiKey, isStreaming, fullTranscript, settings])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearChat = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    sendSuggestionClick,
    stopStreaming,
    clearChat,
    clearError: () => setError(null),
  }
}
