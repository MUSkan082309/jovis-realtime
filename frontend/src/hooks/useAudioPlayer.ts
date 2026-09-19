import { useRef, useCallback, useState } from 'react'

export function useAudioPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const playAudio = useCallback(async (blob: Blob) => {
    try {
      setIsPlaying(true)
      const arrayBuffer = await blob.arrayBuffer()
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.onended = () => setIsPlaying(false)
      source.start()
    } catch (err) {
      console.error('Audio playback error:', err)
      setIsPlaying(false)
    }
  }, [])

  const stop = useCallback(() => {
    audioContextRef.current?.close()
    audioContextRef.current = null
    setIsPlaying(false)
  }, [])

  return { playAudio, stop, isPlaying }
}