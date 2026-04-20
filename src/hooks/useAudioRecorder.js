import { useState, useRef, useCallback } from 'react'
import { transcribeAudio } from '../lib/groq'

const CHUNK_INTERVAL_MS = 30_000 // 30 s chunks

/**
 * useAudioRecorder
 *
 * Returns:
 *   isRecording    – bool
 *   startRecording – () => void
 *   stopRecording  – () => void
 *   transcriptLines – string[]  (each element is one transcribed chunk)
 *   isTranscribing  – bool (true while a Whisper call is in flight)
 *   error           – string | null
 */
export function useAudioRecorder(apiKey) {
  const [isRecording, setIsRecording]       = useState(false)
  const [transcriptLines, setTranscriptLines] = useState([])
  const [isTranscribing, setIsTranscribing]  = useState(false)
  const [error, setError]                   = useState(null)

  const mediaRecorderRef  = useRef(null)
  const chunksRef         = useRef([])       // raw audio bytes for current window
  const chunkTimerRef     = useRef(null)
  const streamRef         = useRef(null)
  const mimeTypeRef       = useRef('audio/webm')
  const initSegmentRef    = useRef(null)     // first webm chunk contains the file header
  const firstFlushDoneRef = useRef(false)

  // ── Flush current audio chunks → Whisper ────────────────────────────────
  const flushChunks = useCallback(async () => {
    if (!chunksRef.current.length || !apiKey) return
    const chunks = [...chunksRef.current]
    chunksRef.current = []
    // Subsequent webm blobs are missing the init segment (file header) — prepend it
    const blobChunks = (firstFlushDoneRef.current && initSegmentRef.current)
      ? [initSegmentRef.current, ...chunks]
      : chunks
    firstFlushDoneRef.current = true
    const blob = new Blob(blobChunks, { type: mimeTypeRef.current })

    setIsTranscribing(true)
    try {
      const text = await transcribeAudio(blob, apiKey)
      if (text) {
        setTranscriptLines(prev => [...prev, text])
      }
    } catch (err) {
      console.error('Transcription error:', err)
      setError(`Transcription error: ${err.message}`)
    } finally {
      setIsTranscribing(false)
    }
  }, [apiKey])

  // ── Start recording ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError(null)
    initSegmentRef.current = null
    firstFlushDoneRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      // Store only the base type (no codec params) — Groq rejects "audio/webm;codecs=opus"
      mimeTypeRef.current = (mimeType || 'audio/webm').split(';')[0]
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          if (!initSegmentRef.current) {
            initSegmentRef.current = e.data  // webm header — needed for all subsequent blobs
          }
          chunksRef.current.push(e.data)
        }
      }

      recorder.start(1000) // collect data every 1s so we always have a recent blob
      setIsRecording(true)

      // Flush every CHUNK_INTERVAL_MS
      chunkTimerRef.current = setInterval(flushChunks, CHUNK_INTERVAL_MS)
    } catch (err) {
      setError(`Microphone error: ${err.message}`)
    }
  }, [flushChunks])

  // ── Stop recording ───────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    clearInterval(chunkTimerRef.current)
    chunkTimerRef.current = null

    // Wait for MediaRecorder to fully stop so the final ondataavailable fires
    // and all audio bytes are in chunksRef before we flush.
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      await new Promise(resolve => {
        recorder.onstop = resolve
        recorder.stop()
      })
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    // Flush BEFORE marking as not recording so the suggestions effect
    // can still fire (it guards on isRecording being true).
    await flushChunks()
    setIsRecording(false)
  }, [flushChunks])

  // ── Manual flush (called by refresh button) ──────────────────────────────
  const manualFlush = useCallback(async () => {
    if (!isRecording) return
    // Stop the current interval, flush, restart interval
    clearInterval(chunkTimerRef.current)
    await flushChunks()
    chunkTimerRef.current = setInterval(flushChunks, CHUNK_INTERVAL_MS)
  }, [isRecording, flushChunks])

  return {
    isRecording,
    startRecording,
    stopRecording,
    manualFlush,
    transcriptLines,
    isTranscribing,
    error,
  }
}

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}
