import { useState } from 'react'
import { Key, ExternalLink } from 'lucide-react'
import styles from './ApiKeyGate.module.css'

export function ApiKeyGate({ onSave }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const trimmed = key.trim()
    if (!trimmed.startsWith('gsk_') || trimmed.length < 20) {
      setError('That doesn\'t look like a valid Groq key (should start with gsk_)')
      return
    }
    setError('')
    onSave(trimmed)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <Key size={28} />
        </div>
        <h1 className={styles.title}>TwinMind</h1>
        <p className={styles.subtitle}>Live Meeting Suggestions</p>

        <div className={styles.form}>
          <label className={styles.label}>
            Groq API Key
          </label>
          <input
            type="password"
            className={styles.input}
            value={key}
            onChange={e => { setKey(e.target.value); setError('') }}
            placeholder="gsk_..."
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
            spellCheck={false}
          />
          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.btn} onClick={handleSubmit} disabled={!key.trim()}>
            Start Session
          </button>
        </div>

        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Get a free Groq API key <ExternalLink size={12} />
        </a>

        <p className={styles.footnote}>
          Your key is stored only in your browser's localStorage.<br />
          It is never sent anywhere except directly to Groq's API.
        </p>
      </div>
    </div>
  )
}
