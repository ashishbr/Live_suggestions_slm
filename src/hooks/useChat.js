import { useState, useCallback, useRef } from 'react'
import { streamCompletion } from '../lib/groq'
import { DEFAULT_SETTINGS, getContextWindow } from '../lib/prompts'

const nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export function useChat(transcriptLines, apiKey, settings) {
  const [messages, setMessages]       = useState([])
  const [isStreaming, setIsStreaming]  = useState(false)
  const [error, setError]             = useState(null)
  const abortRef                      = useRef(null)

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

  const sendMessage = useCallback(async (userText, detailHint = null) => {
    if (!apiKey || !userText.trim() || isStreaming) return
    setError(null)

    const content = detailHint
      ? `${userText}\n\n[Context hint for your answer: ${detailHint}]`
      : userText

    const userMsg      = { id: nextId(), role: 'user',      content: userText, timestamp: new Date() }
    const assistantMsg = { id: nextId(), role: 'assistant', content: '',       timestamp: new Date() }
    setMessages(prev => [...prev, userMsg, assistantMsg])

    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
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
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = { ...last, content: `⚠ ${err.message}` }
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [apiKey, isStreaming, messages, buildSystemMessage])

  const sendSuggestionClick = useCallback(async (suggestion, transcriptForDetail) => {
    if (!apiKey || isStreaming) return
    setError(null)

    const ctx = getContextWindow(
      transcriptForDetail || fullTranscript,
      settings?.detailContextWords ?? DEFAULT_SETTINGS.detailContextWords
    )

    const userMsg      = { id: nextId(), role: 'user',      content: suggestion.preview, timestamp: new Date(), fromSuggestion: true }
    const assistantMsg = { id: nextId(), role: 'assistant', content: '',                 timestamp: new Date() }
    setMessages(prev => [...prev, userMsg, assistantMsg])

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
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = { ...last, content: `⚠ ${err.message}` }
        }
        return updated
      })
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
  }
}
