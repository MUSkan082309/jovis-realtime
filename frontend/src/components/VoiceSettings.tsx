import { useState } from 'react'

interface Props {
  onVoiceSelect?: (voice: string) => void
}

export default function VoiceSettings({ onVoiceSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState('nova')

  const voices = [
    { id: 'alloy', label: 'Alloy' },
    { id: 'echo', label: 'Echo' },
    { id: 'fable', label: 'Fable' },
    { id: 'onyx', label: 'Onyx' },
    { id: 'nova', label: 'Nova' },
    { id: 'shimmer', label: 'Shimmer' },
  ]

  const handleSelect = (voiceId: string) => {
    setSelectedVoice(voiceId)
    onVoiceSelect?.(voiceId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-[var(--jarvis-text-secondary)] hover:text-[var(--jarvis-text)] transition-colors"
        aria-label="Voice settings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 z-20 bg-[var(--jarvis-surface)] border border-[var(--jarvis-border)] rounded-xl p-2 shadow-lg min-w-32">
            <p className="text-xs text-[var(--jarvis-text-secondary)] px-2 pb-1">Voice</p>
            {voices.map((v) => (
              <button
                key={v.id}
                onClick={() => handleSelect(v.id)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedVoice === v.id
                    ? 'bg-[var(--jarvis-primary)] text-white'
                    : 'text-[var(--jarvis-text)] hover:bg-[var(--jarvis-border)]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}