import { useRef, useCallback, useState } from 'react'
import type { WsMessage } from '../types'

type MessageHandler = (msg: WsMessage) => void
type BinaryHandler = (data: ArrayBuffer) => void

export function useWebSocket(onMessage: MessageHandler, onBinary?: BinaryHandler) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(
    (url: string) => {
      try {
        if (wsRef.current) {
          wsRef.current.close()
        }

        let wsUrl = url
        if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          const host = window.location.host || 'localhost:5178'
          wsUrl = `${protocol}//${host}${url.startsWith('/') ? url : '/' + url}`
        }

        const ws = new WebSocket(wsUrl)
        ws.binaryType = 'arraybuffer'
        wsRef.current = ws

        ws.onopen = () => setIsConnected(true)
        ws.onclose = () => setIsConnected(false)
        ws.onerror = (err) => {
          console.warn('WebSocket connection error:', err)
          setIsConnected(false)
        }

        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            onBinary?.(event.data)
          } else {
            try {
              const data: WsMessage = JSON.parse(event.data)
              onMessage(data)
            } catch {
              console.warn('Unparseable WS message:', event.data)
            }
          }
        }
      } catch (err) {
        console.warn('Failed to initialize WebSocket:', err)
        setIsConnected(false)
      }
    },
    [onMessage, onBinary]
  )

  const send = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', content }))
    }
  }, [])

  const sendBinary = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    }
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
  }, [])

  return { connect, send, sendBinary, disconnect, isConnected }
}