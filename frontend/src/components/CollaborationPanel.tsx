import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { useCollaboration, getCollaborationSession } from '../hooks/useCollaboration'
import type { Collaborator } from '../hooks/useCollaboration'
import {
  Users,
  UserPlus,
  Radio,
  Copy,
  Check,
  LogOut,
} from 'lucide-react'

interface CollaborationPanelProps {
  presentationId: string | null
  content: string
  onContentChange: (content: string) => void
}

export function CollaborationPanel({
  presentationId,
  content,
  onContentChange,
}: CollaborationPanelProps) {
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [userName, setUserName] = useState('')
  const [sessionInfo, setSessionInfo] = useState<{
    active: boolean
    collaborator_count: number
    collaborators: Collaborator[]
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleContentUpdate = useCallback((newContent: string) => {
    onContentChange(newContent)
  }, [onContentChange])

  const {
    isConnected,
    collaborators,
    connect,
    disconnect,
    sendContentChange,
  } = useCollaboration({
    presentationId,
    userName,
    onContentUpdate: handleContentUpdate,
  })

  // Check for existing session
  useEffect(() => {
    if (!presentationId) return
    getCollaborationSession(presentationId)
      .then(setSessionInfo)
      .catch(() => setSessionInfo(null))
  }, [presentationId, isConnected])

  const handleJoin = () => {
    if (!userName.trim()) return
    connect()
    setShowJoinDialog(false)
  }

  const handleLeave = () => {
    disconnect()
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/slides/${presentationId}?collab=true`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Send content changes when connected
  useEffect(() => {
    if (isConnected) {
      sendContentChange(content)
    }
  }, [content, isConnected, sendContentChange])

  if (!presentationId) return null

  return (
    <>
      {/* Collaboration Status Bar */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
              <Radio className="w-3 h-3 text-green-600 dark:text-green-400 animate-pulse" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                Live
              </span>
            </div>
            <div className="flex -space-x-2">
              {collaborators.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-slate-900"
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {collaborators.length > 4 && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-slate-300 dark:bg-slate-700 border-2 border-white dark:border-slate-900">
                  +{collaborators.length - 4}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="h-7 px-2"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              className="h-7 px-2 text-red-500 hover:text-red-600"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJoinDialog(true)}
            className="h-8 gap-2"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Collaborate</span>
            {sessionInfo?.active && sessionInfo.collaborator_count > 0 && (
              <Badge className="ml-1 bg-green-500/20 text-green-600 border-green-500/30">
                {sessionInfo.collaborator_count}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Join Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5 text-sky-400" />
              Join Collaboration
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {sessionInfo?.active && sessionInfo.collaborator_count > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Radio className="w-4 h-4 text-green-400 animate-pulse" />
                  <span className="text-sm font-medium text-green-400">
                    Active Session
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {sessionInfo.collaborators.slice(0, 3).map((c) => (
                    <div
                      key={c.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  <span className="text-xs text-slate-400">
                    {sessionInfo.collaborator_count} collaborator
                    {sessionInfo.collaborator_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Name
              </label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="bg-slate-800 border-slate-700"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>

            <Button
              onClick={handleJoin}
              disabled={!userName.trim()}
              className="w-full bg-sky-500 hover:bg-sky-600"
            >
              <Users className="w-4 h-4 mr-2" />
              Join Session
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Others will see your cursor and changes in real-time
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Collaborator Cursors Overlay (for use in editor)
export function CollaboratorCursors({
  collaborators,
  myId,
}: {
  collaborators: Collaborator[]
  myId: string | null
}) {
  const otherCollaborators = collaborators.filter((c) => c.id !== myId)

  if (otherCollaborators.length === 0) return null

  return (
    <div className="fixed pointer-events-none z-50">
      {otherCollaborators.map((c) => (
        <div
          key={c.id}
          className="absolute transition-all duration-100"
          style={{
            // Position would be calculated based on cursor_position
            // This is a placeholder - actual implementation would need
            // coordination with Monaco editor
            top: 0,
            left: 0,
          }}
        >
          <div
            className="w-0.5 h-5"
            style={{ backgroundColor: c.color }}
          />
          <div
            className="px-1.5 py-0.5 rounded text-xs text-white whitespace-nowrap"
            style={{ backgroundColor: c.color }}
          >
            {c.name}
          </div>
        </div>
      ))}
    </div>
  )
}
