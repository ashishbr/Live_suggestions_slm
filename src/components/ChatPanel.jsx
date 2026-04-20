import { useEffect, useRef, useState } from 'react'
import { Send, StopCircle, Trash2, Bot, User } from 'lucide-react'
import { ErrorBanner, EmptyState } from './PanelPrimitives'
import styles from './ChatPanel.module.css'

export function ChatPanel({
  messages,
  isStreaming,
  error,
  onSend,
  onStop,
  onClear,
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    onSend(text)
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.label}>CHAT</span>
        {messages.length > 0 && (
          <button className={styles.clearBtn} onClick={onClear} title="Clear chat">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <ErrorBanner error={error} />

      <div className={styles.messages}>
        {isEmpty ? (
          <EmptyState
            icon={Bot}
            title="Click a suggestion or ask anything"
            hint="Full transcript context is passed with every message."
          />
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isLast={i === messages.length - 1}
                isStreaming={isStreaming}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className={styles.inputArea}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the conversation…"
          rows={1}
          disabled={isStreaming}
        />
        <button
          className={`${styles.sendBtn} ${isStreaming ? styles.stopBtn : ''}`}
          onClick={isStreaming ? onStop : handleSend}
          disabled={!isStreaming && !input.trim()}
          title={isStreaming ? 'Stop' : 'Send'}
        >
          {isStreaming ? <StopCircle size={16} /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}

function MessageBubble({ msg, isLast, isStreaming }) {
  const isUser  = msg.role === 'user'
  const isAI    = msg.role === 'assistant'
  const isEmpty = isAI && !msg.content && isLast && isStreaming

  return (
    <div className={`${styles.msgRow} ${isUser ? styles.msgUser : styles.msgAI}`}>
      <div className={styles.msgIcon}>
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>
      <div className={styles.msgContent}>
        {msg.fromSuggestion && (
          <span className={styles.suggestionTag}>from suggestion</span>
        )}
        {isEmpty ? (
          <span className={styles.cursor}>▊</span>
        ) : (
          <div className={styles.msgText}>
            {renderText(msg.content)}
            {isAI && isLast && isStreaming && <span className={styles.cursor}>▊</span>}
          </div>
        )}
        {msg.timestamp && (
          <span className={styles.msgTime}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}

function renderText(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : part
      )}
    </span>
  ))
}
