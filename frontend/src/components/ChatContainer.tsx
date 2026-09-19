import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import VoiceButton from './VoiceButton'
import ArcReactor from './ArcReactor'
import SystemPanel from './SystemPanel'
import PerformancePanel from './PerformancePanel'
import CommandHints from './CommandHints'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { usePerformance } from '../hooks/usePerformance'
import { useSpeech } from '../hooks/useSpeech'
import { useMicAnalyser } from '../hooks/useMicAnalyser'
import { gatherSystemInfo } from '../lib/systemInfo'
import { processCommand, type BrainContext } from '../lib/brain'
import type { ChatMessage } from '../lib/ai'
import type { Message, WsMessage, VoiceStatus, SystemInfo } from '../types'

let msgCounter = 0
const getMsgId = () => `msg-${msgCounter++}-${Date.now()}`

export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system-welcome',
      role: 'jarvis',
      content: "J.O.V.I.S. neural link online. All telemetry systems nominal, sir. How may I assist you?",
      text: "J.O.V.I.S. neural link online. All telemetry systems nominal, sir. How may I assist you?",
      timestamp: Date.now(),
      time: Date.now(),
    },
  ])
  const [thinking, setThinking] = useState(false)
  const [aiStatus, setAiStatus] = useState('')
  const [hudMode, setHudMode] = useState(true)
  const [muted, setMuted] = useState(false)
  const [wakeMode, setWakeMode] = useState(false)
  const [system, setSystem] = useState<SystemInfo | null>(null)
  const [scanning, setScanning] = useState(false)

  const messagesRef = useRef<Message[]>(messages)
  const systemRef = useRef<SystemInfo | null>(null)
  const mutedRef = useRef(muted)
  const isConnectedRef = useRef(false)

  const { snapshot, history: perfHistory } = usePerformance()
  const snapshotRef = useRef(snapshot)
  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  useEffect(() => {
    systemRef.current = system
  }, [system])

  const { playAudio } = useAudioPlayer()

  // System telemetry scanner
  const scanSystem = useCallback(async () => {
    setScanning(true)
    try {
      const info = await gatherSystemInfo()
      setSystem(info)
    } finally {
      setScanning(false)
    }
  }, [])

  useEffect(() => {
    scanSystem()
  }, [scanSystem])

  // Speech hooks (Web Speech API Recognition + Synthesis)
  const processRef = useRef<(raw: string) => void>(() => {})
  const onTranscript = useCallback((text: string) => {
    processRef.current(text)
  }, [])

  const speech = useSpeech({ onTranscript })
  const micLevelRef = useMicAnalyser(speech.listening)
  const fallbackLevelRef = useRef(0.15)

  // Determine current Voice/Reactor Status
  const voiceStatus: VoiceStatus = useMemo(() => {
    if (speech.listening) return 'listening'
    if (thinking) return 'thinking'
    if (speech.speaking) return 'speaking'
    return 'idle'
  }, [speech.listening, thinking, speech.speaking])

  // WebSocket support (for optional backend server)
  const handleBinaryAudio = useCallback(
    (data: ArrayBuffer) => {
      const blob = new Blob([data], { type: 'audio/webm;codecs=opus' })
      playAudio(blob)
    },
    [playAudio]
  )

  const handleWsMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'token':
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'jarvis' || last?.role === 'assistant') {
            const updatedContent = (last.content || last.text || '') + msg.content
            return [
              ...prev.slice(0, -1),
              { ...last, content: updatedContent, text: updatedContent },
            ]
          }
          return [
            ...prev,
            {
              id: getMsgId(),
              role: 'jarvis',
              content: msg.content,
              text: msg.content,
              timestamp: Date.now(),
              time: Date.now(),
            },
          ]
        })
        break
      case 'done':
        setThinking(false)
        break
      case 'error':
        setThinking(false)
        setMessages((prev) => [
          ...prev,
          {
            id: getMsgId(),
            role: 'system',
            content: `Error: ${msg.content}`,
            text: `Error: ${msg.content}`,
            timestamp: Date.now(),
            time: Date.now(),
          },
        ])
        break
      case 'transcript':
        processRef.current(msg.content)
        break
    }
  }, [])

  const { connect, send, disconnect, isConnected } = useWebSocket(
    handleWsMessage,
    handleBinaryAudio
  )

  isConnectedRef.current = isConnected

  // Primary turn processor: executes commands, web actions, Wikipedia knowledge, and spoken response
  const processUserTurn = useCallback(
    async (rawText: string) => {
      const clean = rawText.trim()
      if (!clean) return

      // Handle simple "Jovis" wake call
      if (clean.toLowerCase() === 'jovis') {
        setThinking(true)
        setTimeout(() => {
          const ack = "Yes, sir? I am online and listening."
          setMessages((prev) => [
            ...prev,
            {
              id: getMsgId(),
              role: 'jarvis',
              content: ack,
              text: ack,
              timestamp: Date.now(),
              time: Date.now(),
            },
          ])
          if (!mutedRef.current) speech.speak(ack)
          setThinking(false)
        }, 300)
        return
      }

      // Add user message to conversation
      setMessages((prev) => [
        ...prev,
        {
          id: getMsgId(),
          role: 'user',
          content: clean,
          text: clean,
          timestamp: Date.now(),
          time: Date.now(),
        },
      ])

      if (speech.speaking) speech.cancelSpeak()
      setThinking(true)
      setAiStatus('Processing neural command...')

      // If backend WebSocket is active, attempt to send through WS
      if (isConnectedRef.current) {
        send(clean)
        return
      }

      // Standalone intelligent processing via brain.ts
      const convo: ChatMessage[] = messagesRef.current
        .filter((m) => m.role === 'user' || m.role === 'jarvis' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content || m.text || '',
        }))

      const ctx: BrainContext = {
        system: systemRef.current,
        performance: snapshotRef.current,
        history: convo,
        aiEnabled: true,
      }

      let res
      try {
        res = await processCommand(clean, ctx, (status) => setAiStatus(status))
      } catch {
        res = {
          text: "My apologies, sir. I encountered a minor disruption while analyzing that request.",
          action: "search" as const,
          url: `https://www.google.com/search?q=${encodeURIComponent(clean)}`,
        }
      }

      setAiStatus('')

      // Handle action link
      let link: { url: string; label: string } | undefined
      if ((res.action === 'open' || res.action === 'search') && res.url) {
        try {
          window.location.href = res.url
        } catch {
          /* browser popup blocked */
        }
        link = {
          url: res.url,
          label: res.action === 'search' ? 'View Web Search Results' : 'Open Link',
        }
      }

      const replyText = res.text
      await new Promise((r) => setTimeout(r, 200))

      setMessages((prev) => [
        ...prev,
        {
          id: getMsgId(),
          role: 'jarvis',
          content: replyText,
          text: replyText,
          timestamp: Date.now(),
          time: Date.now(),
          link,
        },
      ])

      if (!mutedRef.current) {
        speech.speak(replyText)
      }
      setThinking(false)
    },
    [send, speech]
  )

  processRef.current = processUserTurn

  // Toggle voice recognition
  const handleVoiceToggle = useCallback(() => {
    if (speech.listening) {
      if (wakeMode) {
        speech.stopWakeMode()
      } else {
        speech.stopListening()
      }
    } else {
      if (speech.speaking) speech.cancelSpeak()
      if (wakeMode) {
        speech.startWakeMode()
      } else {
        speech.listen()
      }
    }
  }, [speech, wakeMode])

  // Toggle wake word hands-free mode
  const handleWakeToggle = useCallback(() => {
    const nextMode = !wakeMode
    setWakeMode(nextMode)
    if (speech.listening) {
      speech.stopListening()
      if (nextMode) {
        speech.startWakeMode()
      }
    }
  }, [wakeMode, speech])

  return (
    <div className="flex flex-col h-dvh bg-[var(--jarvis-bg)] text-[#cfe8ff] overflow-hidden select-none">
      {/* HUD Header */}
      <header className="flex items-center justify-between px-6 py-2.5 border-b border-cyan-400/20 bg-slate-950/80 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#38e1ff]" />
          <h1 className="font-display text-base font-bold tracking-[0.25em] text-cyan-200 text-glow">
            J.O.V.I.S.
          </h1>
          <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest text-cyan-400/60 border-l border-cyan-400/20 pl-3">
            Realtime Neural Core
          </span>
          {aiStatus && (
            <span className="text-[11px] font-mono text-cyan-300 animate-pulse ml-2 hidden md:inline">
              [{aiStatus}]
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Wake word toggle */}
          <button
            onClick={handleWakeToggle}
            title={wakeMode ? 'Wake word active (Say "Jovis")' : 'Wake word inactive'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-mono tracking-wider transition ${
              wakeMode
                ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                : 'border-cyan-400/30 text-cyan-300/60 hover:text-cyan-200 hover:bg-cyan-400/10'
            }`}
          >
            <span>WAKE WORD: {wakeMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Mute voice output toggle */}
          <button
            onClick={() => {
              if (speech.speaking) speech.cancelSpeak()
              setMuted((m) => !m)
            }}
            title={muted ? 'Jovis voice muted' : 'Jovis voice unmuted'}
            className={`p-1.5 rounded border text-xs transition ${
              muted
                ? 'border-red-400/40 bg-red-500/10 text-red-300'
                : 'border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10'
            }`}
          >
            {muted ? '🔇' : '🔊'}
          </button>

          {/* HUD Mode Toggle Button */}
          <button
            onClick={() => setHudMode((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1 rounded border border-cyan-400/30 text-[11px] font-display uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/10 transition"
          >
            <span>{hudMode ? '◈ Cockpit HUD' : '◇ Minimal Chat'}</span>
          </button>

          {/* Connection badge */}
          <div className="flex items-center gap-2 border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1 rounded-full text-xs">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-green-400 shadow-[0_0_6px_#44ff88]'
                  : 'bg-cyan-400 shadow-[0_0_6px_#38e1ff]'
              }`}
            />
            <span className="text-[11px] text-cyan-300/80">
              {isConnected ? 'LIVE WS' : 'NEURAL CORE'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Cockpit Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative hud-grid">
        {/* Top telemetry & Arc Reactor grid when HUD mode is active */}
        {hudMode && (
          <div className="shrink-0 p-4 border-b border-cyan-400/15 bg-slate-950/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Left: System Panel */}
              <div className="hidden md:block">
                <SystemPanel system={system} scanning={scanning} onRescan={scanSystem} />
              </div>

              {/* Center: Arc Reactor */}
              <div className="flex flex-col items-center justify-center py-1">
                <div className="relative">
                  <ArcReactor
                    mode={voiceStatus}
                    levelRef={speech.listening ? micLevelRef : fallbackLevelRef}
                    size={210}
                  />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-cyan-300/60">REACTOR:</span>
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-cyan-200 text-glow">
                    {voiceStatus}
                  </span>
                  {speech.interim && (
                    <span className="text-[11px] font-mono text-cyan-300/90 italic truncate max-w-[200px]">
                      "{speech.interim}"
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Performance Panel */}
              <div className="hidden md:block">
                <PerformancePanel snapshot={snapshot} history={perfHistory} />
              </div>
            </div>
          </div>
        )}

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-black/30">
          <MessageList messages={messages} isStreaming={thinking} />
        </div>

        {/* Command Hints Bar */}
        <div className="px-6 py-2 border-t border-cyan-400/10 bg-slate-950/40 backdrop-blur-sm overflow-x-auto">
          <CommandHints onCommand={processUserTurn} />
        </div>

        {/* Console Input Bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-t border-cyan-400/20 bg-slate-950/80 backdrop-blur-md shrink-0">
          <VoiceButton
            status={voiceStatus}
            onToggle={handleVoiceToggle}
            disabled={thinking}
          />
          <div className="flex-1">
            <MessageInput onSend={processUserTurn} disabled={thinking} />
          </div>
        </div>
      </div>
    </div>
  )
}