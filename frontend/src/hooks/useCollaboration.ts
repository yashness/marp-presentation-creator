import { useState, useEffect, useCallback, useRef } from 'react'
import { API_BASE_URL } from '../lib/constants'

export interface Collaborator {
  id: string
  name: string
  color: string
  cursor_position?: number
  selection_start?: number | null
  selection_end?: number | null
}

interface CollaborationMessage {
  type: string
  [key: string]: unknown
}

interface UseCollaborationOptions {
  presentationId: string | null
  userName: string
  onContentUpdate?: (content: string) => void
  onCursorUpdate?: (userId: string, position: number) => void
  onSelectionUpdate?: (userId: string, start: number | null, end: number | null) => void
}

export function useCollaboration({
  presentationId,
  userName,
  onContentUpdate,
  onCursorUpdate,
  onSelectionUpdate,
}: UseCollaborationOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const versionRef = useRef(0)

  const connect = useCallback(() => {
    if (!presentationId || wsRef.current) return

    const wsUrl = API_BASE_URL.replace('http', 'ws')
    const url = `${wsUrl}/api/collab/ws/${presentationId}?name=${encodeURIComponent(userName)}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
    }

    ws.onclose = () => {
      setIsConnected(false)
      wsRef.current = null
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    ws.onmessage = (event) => {
      try {
        const message: CollaborationMessage = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Failed to parse message:', error)
      }
    }
  }, [presentationId, userName])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setCollaborators([])
    setMyId(null)
  }, [])

  const handleMessage = useCallback((message: CollaborationMessage) => {
    switch (message.type) {
      case 'session_state':
        setMyId(message.collaborator_id as string)
        setCollaborators(message.users as Collaborator[])
        if (message.content) {
          onContentUpdate?.(message.content as string)
        }
        break

      case 'user_joined':
        setCollaborators((prev) => [...prev, message.user as Collaborator])
        break

      case 'user_left':
        setCollaborators((prev) => prev.filter((c) => c.id !== message.user_id))
        break

      case 'content_update':
        versionRef.current = message.version as number
        onContentUpdate?.(message.content as string)
        break

      case 'cursor_update':
        onCursorUpdate?.(message.user_id as string, message.position as number)
        setCollaborators((prev) =>
          prev.map((c) =>
            c.id === message.user_id ? { ...c, cursor_position: message.position as number } : c
          )
        )
        break

      case 'selection_update':
        onSelectionUpdate?.(
          message.user_id as string,
          message.start as number | null,
          message.end as number | null
        )
        setCollaborators((prev) =>
          prev.map((c) =>
            c.id === message.user_id
              ? { ...c, selection_start: message.start as number | null, selection_end: message.end as number | null }
              : c
          )
        )
        break
    }
  }, [onContentUpdate, onCursorUpdate, onSelectionUpdate])

  const sendContentChange = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    versionRef.current += 1
    wsRef.current.send(JSON.stringify({
      type: 'content_change',
      content,
      version: versionRef.current,
    }))
  }, [])

  const sendCursorMove = useCallback((position: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({
      type: 'cursor_move',
      position,
    }))
  }, [])

  const sendSelectionChange = useCallback((start: number | null, end: number | null) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({
      type: 'selection_change',
      start,
      end,
    }))
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    collaborators,
    myId,
    connect,
    disconnect,
    sendContentChange,
    sendCursorMove,
    sendSelectionChange,
  }
}

// Fetch session info
export async function getCollaborationSession(presentationId: string): Promise<{
  active: boolean
  collaborator_count: number
  collaborators: Collaborator[]
}> {
  const response = await fetch(`${API_BASE_URL}/api/collab/session/${presentationId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch session info')
  }
  return response.json()
}
