import { useState, useEffect } from 'react'
import ChatContainer from './components/ChatContainer'
import BootSequence from './components/BootSequence'
import { gatherSystemInfo } from './lib/systemInfo'
import type { SystemInfo } from './types'
import ParticleBackground from './components/ParticleBackground'
import './styles/globals.css'

function App() {
  const [booted, setBooted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [system, setSystem] = useState<SystemInfo | null>(null)

  useEffect(() => {
    gatherSystemInfo().then(setSystem)
    const start = Date.now()
    const duration = 1200
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / duration) * 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(interval)
      }
    }, 35)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <ParticleBackground />
      {!booted && (
        <BootSequence
          progress={progress}
          system={system}
          onDone={() => setBooted(true)}
        />
      )}
      <ChatContainer />
    </>
  )
}

export default App