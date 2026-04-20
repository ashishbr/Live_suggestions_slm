import { useState, useEffect } from 'react'
import { RefreshCw, Loader, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { SUGGESTION_TYPE_META } from '../lib/prompts'
import styles from './SuggestionsPanel.module.css'

export function SuggestionsPanel({
  batches,
  isLoading,
  error,
  onRefresh,
  onSuggestionClick,
  isRecording,
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Auto-jump to newest batch when a new one arrives
  useEffect(() => {
    setCurrentIndex(0)
  }, [batches.length])

  const isEmpty = batches.length === 0
  const activeBatch = batches[currentIndex] ?? null
  const total = batches.length

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.label}>SUGGESTIONS</span>
          {isLoading && (
            <span className={styles.loadingBadge}>
              <Loader size={11} className={styles.spin} />
              thinking
            </span>
          )}
        </div>

        <div className={styles.headerRight}>
          {total > 1 && (
            <div className={styles.navControls}>
              <button
                className={styles.navBtn}
                onClick={() => setCurrentIndex(i => Math.min(i + 1, total - 1))}
                disabled={currentIndex >= total - 1}
                title="Older suggestions"
              >
                <ChevronLeft size={13} />
              </button>
              <span className={styles.navCount}>{total - currentIndex}/{total}</span>
              <button
                className={styles.navBtn}
                onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
                disabled={currentIndex === 0}
                title="Newer suggestions"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
          <button
            className={styles.refreshBtn}
            onClick={onRefresh}
            disabled={isLoading || !isRecording}
            title="Refresh suggestions"
          >
            <RefreshCw size={13} className={isLoading ? styles.spin : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      <div className={styles.body}>
        {isEmpty && !isLoading ? (
          <div className={styles.emptyState}>
            <Sparkles size={32} className={styles.emptyIcon} />
            <p>Suggestions appear once the conversation begins</p>
            <p className={styles.emptyHint}>
              They refresh automatically every 30 seconds.
            </p>
          </div>
        ) : (
          <div className={styles.batches}>
            {isLoading && batches.length === 0 && (
              <div className={styles.skeletonBatch}>
                <div className={styles.skeletonLabel} />
                {[0, 1, 2].map(i => (
                  <div key={i} className={`${styles.skeletonCard} loading-shimmer`} />
                ))}
              </div>
            )}

            {activeBatch && (
              <div key={activeBatch.id} className={styles.batch}>
                <div className={styles.batchMeta}>
                  {currentIndex === 0 && <span className={styles.newBadge}>NEW</span>}
                  <span className={styles.batchTime}>
                    {activeBatch.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className={styles.cards}>
                  {activeBatch.items.map((s, si) => {
                    const meta = SUGGESTION_TYPE_META[s.type] || SUGGESTION_TYPE_META.talking_point
                    return (
                      <SuggestionCard
                        key={si}
                        suggestion={s}
                        meta={meta}
                        onClick={() => onSuggestionClick(s)}
                        animIndex={si}
                        isNew={currentIndex === 0}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion, meta, onClick, animIndex, isNew }) {
  return (
    <button
      className={`${styles.card} ${isNew ? styles.cardNew : ''}`}
      style={{
        '--card-color': meta.color,
        '--card-bg': meta.bg,
        animationDelay: isNew ? `${animIndex * 60}ms` : '0ms',
      }}
      onClick={onClick}
    >
      <span className={styles.typePill} style={{ color: meta.color, background: meta.bg }}>
        {meta.label}
      </span>
      <p className={styles.preview}>{suggestion.preview}</p>
      <span className={styles.clickHint}>Click for details →</span>
    </button>
  )
}
