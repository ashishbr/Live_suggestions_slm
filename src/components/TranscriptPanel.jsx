import { useEffect, useRef } from 'react'
import { Mic, MicOff, Loader } from 'lucide-react'
import styles from './TranscriptPanel.module.css'

export function TranscriptPanel({
  isRecording,
  onStart,
  onStop,
  transcriptLines,
  isTranscribing,
  error,
}) {
  const bottomRef = useRef(null)

  // Auto-scroll to latest line
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcriptLines])

  const isEmpty = transcriptLines.length === 0

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.label}>TRANSCRIPT</span>
          {isTranscribing && (
            <span className={styles.transcribingBadge}>
              <Loader size={11} className={styles.spin} />
              processing
            </span>
          )}
        </div>

        <button
          className={`${styles.micBtn} ${isRecording ? styles.micActive : ''}`}
          onClick={isRecording ? onStop : onStart}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <>
              <span className={styles.pulsingDot} />
              <MicOff size={15} />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Mic size={15} />
              <span>Record</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      <div className={styles.body}>
        {isEmpty ? (
          <div className={styles.emptyState}>
            <Mic size={32} className={styles.emptyIcon} />
            <p>Press <strong>Record</strong> to start capturing</p>
            <p className={styles.emptyHint}>
              Transcript chunks appear every ~30 seconds.
              Suggestions update automatically.
            </p>
          </div>
        ) : (
          <div className={styles.lines}>
            {transcriptLines.map((line, i) => (
              <div key={i} className={styles.chunk}>
                <span className={styles.chunkNum}>{i + 1}</span>
                <p className={styles.chunkText}>{line}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {isRecording && (
        <div className={styles.footer}>
          <span className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            LIVE
          </span>
          <span className={styles.chunkCount}>
            {transcriptLines.length} chunk{transcriptLines.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}
