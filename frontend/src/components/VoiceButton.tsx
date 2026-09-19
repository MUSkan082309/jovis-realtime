import type { VoiceStatus } from '../types'

interface Props {
  status: VoiceStatus
  onToggle: () => void
  disabled?: boolean
}

const statusLabels: Record<VoiceStatus, string> = {
  idle: 'Start voice',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
}

const statusColors: Record<VoiceStatus, string> = {
  idle: 'bg-[var(--jarvis-surface)] text-[var(--jarvis-text)] border-[var(--jarvis-border)]',
  listening: 'bg-red-500 text-white border-red-500 animate-pulse',
  thinking: 'bg-yellow-500 text-white border-yellow-500',
  speaking: 'bg-green-500 text-white border-green-500',
}

export default function VoiceButton({ status, onToggle, disabled = false }: Props) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled && status === 'idle'}
      className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full border transition-all ${
        statusColors[status]
      } ${disabled && status === 'idle' ? 'opacity-30' : 'hover:opacity-80'}`}
      aria-label={statusLabels[status]}
      title={statusLabels[status]}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  )
}