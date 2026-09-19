import { useState, useRef } from 'react'

interface Props {
  onSend: (content: string) => void
  disabled?: boolean
}

export default function MessageInput({ onSend, disabled = false }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (!value.trim() || disabled) return
    onSend(value)
    setValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex items-center gap-2 bg-[var(--jarvis-surface)] rounded-full px-4 py-2 border border-[var(--jarvis-border)] focus-within:border-[var(--jarvis-primary)] transition-colors">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 bg-transparent text-sm text-[var(--jarvis-text)] placeholder-[var(--jarvis-text-secondary)] outline-none disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--jarvis-primary)] text-white text-sm disabled:opacity-30 hover:opacity-90 transition-opacity"
        aria-label="Send message"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  )
}