import { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { DEFAULT_SETTINGS } from '../lib/prompts'
import styles from './SettingsModal.module.css'

export function SettingsModal({ settings, onSave, onClose, apiKey, onSaveApiKey }) {
  const [local, setLocal]  = useState({ ...settings })
  const [key, setKey]      = useState(apiKey || '')
  const [keyVisible, setKeyVisible] = useState(false)

  const update = (field, value) => setLocal(prev => ({ ...prev, [field]: value }))

  const handleSave = () => {
    onSaveApiKey(key.trim())
    onSave(local)
    onClose()
  }

  const reset = (field) => update(field, DEFAULT_SETTINGS[field])

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        <div className={styles.body}>
          {/* API Key */}
          <Section label="Groq API Key">
            <div className={styles.keyRow}>
              <input
                type={keyVisible ? 'text' : 'password'}
                className={styles.input}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="gsk_..."
                spellCheck={false}
              />
              <button className={styles.toggleBtn} onClick={() => setKeyVisible(v => !v)}>
                {keyVisible ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className={styles.hint}>
              Your key is stored in localStorage only. Never sent anywhere except Groq.
            </p>
          </Section>

          {/* Context windows */}
          <Section label="Context Windows (words)">
            <div className={styles.numberGrid}>
              <NumberField
                label="Suggestions context"
                value={local.suggestionsContextWords}
                onChange={v => update('suggestionsContextWords', v)}
                onReset={() => reset('suggestionsContextWords')}
                defaultVal={DEFAULT_SETTINGS.suggestionsContextWords}
              />
              <NumberField
                label="Detail context"
                value={local.detailContextWords}
                onChange={v => update('detailContextWords', v)}
                onReset={() => reset('detailContextWords')}
                defaultVal={DEFAULT_SETTINGS.detailContextWords}
              />
              <NumberField
                label="Chat context"
                value={local.chatContextWords}
                onChange={v => update('chatContextWords', v)}
                onReset={() => reset('chatContextWords')}
                defaultVal={DEFAULT_SETTINGS.chatContextWords}
              />
              <NumberField
                label="Auto-refresh (ms)"
                value={local.refreshIntervalMs}
                onChange={v => update('refreshIntervalMs', v)}
                onReset={() => reset('refreshIntervalMs')}
                defaultVal={DEFAULT_SETTINGS.refreshIntervalMs}
              />
            </div>
          </Section>

          {/* Suggestions prompt */}
          <PromptField
            label="Live Suggestions System Prompt"
            value={local.suggestionsSystemPrompt}
            onChange={v => update('suggestionsSystemPrompt', v)}
            onReset={() => reset('suggestionsSystemPrompt')}
          />

          {/* Detail prompt */}
          <PromptField
            label="Detail Answer System Prompt"
            value={local.detailSystemPrompt}
            onChange={v => update('detailSystemPrompt', v)}
            onReset={() => reset('detailSystemPrompt')}
          />

          {/* Chat prompt */}
          <PromptField
            label="Chat System Prompt"
            value={local.chatSystemPrompt}
            onChange={v => update('chatSystemPrompt', v)}
            onReset={() => reset('chatSystemPrompt')}
          />
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function PromptField({ label, value, onChange, onReset }) {
  return (
    <Section label={label}>
      <div style={{ position: 'relative' }}>
        <textarea
          className={styles.textarea}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={6}
        />
        <button className={styles.resetBtn} onClick={onReset} title="Reset to default">
          <RotateCcw size={11} />
        </button>
      </div>
    </Section>
  )
}

function NumberField({ label, value, onChange, onReset, defaultVal }) {
  return (
    <div className={styles.numberField}>
      <label className={styles.numberLabel}>{label}</label>
      <div className={styles.numberRow}>
        <input
          type="number"
          className={`${styles.input} ${styles.numberInput}`}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={0}
        />
        {value !== defaultVal && (
          <button className={styles.toggleBtn} onClick={onReset} title="Reset">
            <RotateCcw size={11} />
          </button>
        )}
      </div>
    </div>
  )
}
