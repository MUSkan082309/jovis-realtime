import { useRef, useCallback, useState } from 'react'

type ChunkHandler = (chunk: Blob) => void

export function useAudioRecorder(onChunk?: ChunkHandler) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          onChunk?.(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      // Fire dataavailable every 250ms for streaming
      mediaRecorder.start(250)
      setIsRecording(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start recording'
      setError(msg)
    }
  }, [onChunk])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  return { startRecording, stopRecording, isRecording, error }
}