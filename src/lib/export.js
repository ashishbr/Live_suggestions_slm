/**
 * Export the full session as JSON and plain text.
 * Called from the export button.
 */
export function exportSession({ transcriptLines, batches, messages }) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  const payload = {
    exportedAt: new Date().toISOString(),
    transcript: transcriptLines.map((line, i) => ({
      chunkIndex: i + 1,
      text: line,
    })),
    suggestionBatches: batches.map(b => ({
      id: b.id,
      timestamp: b.timestamp.toISOString(),
      suggestions: b.items.map(s => ({
        type: s.type,
        preview: s.preview,
        detailHint: s.detail_hint,
      })),
    })),
    chat: messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp?.toISOString?.() ?? null,
      fromSuggestion: m.fromSuggestion ?? false,
    })),
  }

  // JSON download
  const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  downloadBlob(jsonBlob, `twinmind-session-${ts}.json`)
}

export function exportSessionText({ transcriptLines, batches, messages }) {
  const ts = new Date().toLocaleString()
  const lines = []

  lines.push('═══════════════════════════════════════════')
  lines.push('  TWINMIND SESSION EXPORT')
  lines.push(`  ${ts}`)
  lines.push('═══════════════════════════════════════════')
  lines.push('')

  lines.push('── TRANSCRIPT ──────────────────────────────')
  transcriptLines.forEach((l, i) => {
    lines.push(`[Chunk ${i + 1}] ${l}`)
  })
  lines.push('')

  lines.push('── SUGGESTION BATCHES ──────────────────────')
  batches.forEach((b, bi) => {
    lines.push(`\nBatch ${bi + 1} — ${b.timestamp.toLocaleTimeString()}`)
    b.items.forEach((s, si) => {
      lines.push(`  ${si + 1}. [${s.type.toUpperCase()}] ${s.preview}`)
      lines.push(`     → ${s.detail_hint}`)
    })
  })
  lines.push('')

  lines.push('── CHAT HISTORY ────────────────────────────')
  messages.forEach(m => {
    const who = m.role === 'user' ? 'YOU' : 'TWINMIND'
    const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ''
    lines.push(`\n[${who}] ${time}`)
    lines.push(m.content)
  })

  const textBlob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const fileTs = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  downloadBlob(textBlob, `twinmind-session-${fileTs}.txt`)
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
