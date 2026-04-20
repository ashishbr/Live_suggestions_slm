import { useState, useCallback } from 'react'
import { Settings, Download, FileText } from 'lucide-react'

import { ApiKeyGate }       from './components/ApiKeyGate'
import { TranscriptPanel }  from './components/TranscriptPanel'
import { SuggestionsPanel } from './components/SuggestionsPanel'
import { ChatPanel }        from './components/ChatPanel'
import { SettingsModal }    from './components/SettingsModal'

import { useAudioRecorder } from './hooks/useAudioRecorder'
import { useSuggestions }   from './hooks/useSuggestions'
import { useChat }          from './hooks/useChat'

import { DEFAULT_SETTINGS } from './lib/prompts'
import { exportSession, exportSessionText } from './lib/export'

import styles from './App.module.css'

// ── Persistent storage helpers ───────────────────────────────────────────────
const STORAGE_KEY_APIKEY    = 'tm_groq_api_key'
const STORAGE_KEY_SETTINGS  = 'tm_settings'

function loadApiKey()   { return localStorage.getItem(STORAGE_KEY_APIKEY) || '' }
function saveApiKey(k)  { localStorage.setItem(STORAGE_KEY_APIKEY, k) }
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch { return { ...DEFAULT_SETTINGS } }
}
function saveSettings(s) { localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s)) }

export default function App() {
  const [apiKey,   setApiKeyState] = useState(loadApiKey)
  const [settings, setSettings]   = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(false)

  const handleSaveApiKey = useCallback(k => {
    saveApiKey(k)
    setApiKeyState(k)
  }, [])

  const handleSaveSettings = useCallback(s => {
    saveSettings(s)
    setSettings(s)
  }, [])

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {
    isRecording,
    startRecording,
    stopRecording,
    manualFlush,
    transcriptLines,
    isTranscribing,
    error: recorderError,
  } = useAudioRecorder(apiKey)

  const {
    batches,
    isLoading: suggestionsLoading,
    error: suggestionsError,
    refresh: refreshSuggestions,
  } = useSuggestions(transcriptLines, isRecording, apiKey, settings)

  const {
    messages,
    isStreaming,
    error: chatError,
    sendMessage,
    sendSuggestionClick,
    stopStreaming,
    clearChat,
  } = useChat(transcriptLines, apiKey, settings)

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    await manualFlush()
    await refreshSuggestions()
  }, [manualFlush, refreshSuggestions])

  const handleSuggestionClick = useCallback(suggestion => {
    sendSuggestionClick(suggestion, transcriptLines.join('\n'))
  }, [sendSuggestionClick, transcriptLines])

  const handleExportJSON = () =>
    exportSession({ transcriptLines, batches, messages })

  const handleExportText = () =>
    exportSessionText({ transcriptLines, batches, messages })

  // ── Gate: require API key ──────────────────────────────────────────────────
  if (!apiKey) {
    return <ApiKeyGate onSave={handleSaveApiKey} />
  }

  return (
    <div className={styles.app}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.wordmark}>TwinMind</span>
          <span className={styles.tagline}>Live Suggestions</span>
        </div>

        <div className={styles.topbarRight}>
          <div className={styles.exportGroup}>
            <button
              className={styles.iconBtn}
              onClick={handleExportJSON}
              title="Export session as JSON"
              disabled={transcriptLines.length === 0 && messages.length === 0}
            >
              <Download size={14} />
              <span>JSON</span>
            </button>
            <button
              className={styles.iconBtn}
              onClick={handleExportText}
              title="Export session as plain text"
              disabled={transcriptLines.length === 0 && messages.length === 0}
            >
              <FileText size={14} />
              <span>TXT</span>
            </button>
          </div>

          <button
            className={styles.iconBtn}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* ── Three-column layout ─────────────────────────────────────────── */}
      <main className={styles.columns}>
        <div className={styles.col}>
          <TranscriptPanel
            isRecording={isRecording}
            onStart={startRecording}
            onStop={stopRecording}
            transcriptLines={transcriptLines}
            isTranscribing={isTranscribing}
            error={recorderError}
          />
        </div>

        <div className={styles.col}>
          <SuggestionsPanel
            batches={batches}
            isLoading={suggestionsLoading}
            error={suggestionsError}
            onRefresh={handleRefresh}
            onSuggestionClick={handleSuggestionClick}
            isRecording={isRecording}
          />
        </div>

        <div className={styles.col}>
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            error={chatError}
            onSend={sendMessage}
            onStop={stopStreaming}
            onClear={clearChat}
          />
        </div>
      </main>

      {/* ── Settings modal ──────────────────────────────────────────────── */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
          apiKey={apiKey}
          onSaveApiKey={handleSaveApiKey}
        />
      )}
    </div>
  )
}
