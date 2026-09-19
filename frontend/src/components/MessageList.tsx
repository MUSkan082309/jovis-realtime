import { useRef, useEffect } from 'react'
import type { Message } from '../types'

interface Props {
  messages: Message[]
  isStreaming: boolean
}

export default function MessageList({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed border transition-all ${
              msg.role === 'user'
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-100 rounded-br-none shadow-[0_0_15px_rgba(56,225,255,0.15)]'
                : msg.role === 'system'
                  ? 'bg-slate-900/60 border-cyan-400/20 text-cyan-300/70 italic rounded-bl-none font-mono text-xs'
                  : 'bg-slate-900/80 border-cyan-400/30 text-cyan-100 rounded-bl-none shadow-[0_0_15px_rgba(56,225,255,0.1)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/60">
                {msg.role === 'user' ? 'COMMANDER' : msg.role === 'system' ? 'SYSTEM' : 'J.A.R.V.I.S.'}
              </span>
            </div>
            <div>{msg.content || msg.text}</div>
            {msg.link && (
              <a
                href={msg.link.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-400/15 border border-cyan-400/40 text-xs font-mono text-cyan-200 hover:bg-cyan-400/30 transition"
              >
                <span>↗ {msg.link.label || 'Launch Link'}</span>
              </a>
            )}
          </div>
        </div>
      ))}

      {isStreaming && (
        <div className="flex justify-start">
          <div className="bg-[var(--jarvis-surface)] rounded-2xl rounded-bl-md px-4 py-3">
            <span className="flex gap-1">
              <span className="w-2 h-2 bg-[var(--jarvis-text-secondary)] rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-[var(--jarvis-text-secondary)] rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-[var(--jarvis-text-secondary)] rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}