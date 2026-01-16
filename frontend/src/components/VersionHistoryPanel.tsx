import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './ui/button'
import {
  History,
  X,
  RotateCcw,
  Trash2,
  Save,
  Clock,
  Tag,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useVersioning } from '../hooks/useVersioning'
import type { RestoreVersionResponse, PresentationVersion } from '../api/client'

interface VersionHistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  presentationId: string | null
  presentationTitle: string
  onRestore: (data: RestoreVersionResponse) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function VersionItem({
  version,
  onRestore,
  onDelete,
  isRestoring
}: {
  version: PresentationVersion
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  isRestoring: boolean
}) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div
        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setShowPreview(!showPreview)}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            v{version.version_number}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
              {version.checkpoint_name || version.title}
            </h4>
            {version.checkpoint_name && (
              <Tag className="w-3 h-3 text-primary-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3 h-3" />
            {formatDate(version.created_at)}
          </div>
        </div>

        <ChevronRight className={cn(
          "w-4 h-4 text-slate-400 transition-transform",
          showPreview && "rotate-90"
        )} />
      </div>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Content preview:
              </div>
              <pre className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 max-h-32 overflow-auto">
                {version.content.slice(0, 500)}
                {version.content.length > 500 && '...'}
              </pre>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRestore(version.id)
                  }}
                  disabled={isRestoring}
                  className="flex-1"
                >
                  {isRestoring ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-1" />
                  )}
                  Restore
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this version?')) {
                      onDelete(version.id)
                    }
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function VersionHistoryPanel({
  isOpen,
  onClose,
  presentationId,
  presentationTitle,
  onRestore
}: VersionHistoryPanelProps) {
  const [checkpointName, setCheckpointName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)

  const {
    versions,
    isLoading,
    isSaving,
    loadVersions,
    saveCheckpoint,
    restore,
    remove
  } = useVersioning(presentationId, { onRestore })

  useEffect(() => {
    if (isOpen && presentationId) {
      loadVersions()
    }
  }, [isOpen, presentationId, loadVersions])

  const handleSaveCheckpoint = async () => {
    await saveCheckpoint(checkpointName || undefined)
    setCheckpointName('')
    setShowSaveForm(false)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-[380px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-50"
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-700 to-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-white/20">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Version History</h2>
              <p className="text-xs text-white/70 truncate max-w-[200px]">
                {presentationTitle}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Save Checkpoint Button/Form */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          {showSaveForm ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Checkpoint name (optional)"
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveCheckpoint}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSaveForm(false)
                    setCheckpointName('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowSaveForm(true)}
              disabled={!presentationId}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Checkpoint
            </Button>
          )}
        </div>

        {/* Versions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!presentationId ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select a presentation to view its history
              </p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-primary-500 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading versions...
              </p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No versions yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Save a checkpoint to create your first version
              </p>
            </div>
          ) : (
            versions.map((version) => (
              <VersionItem
                key={version.id}
                version={version}
                onRestore={restore}
                onDelete={remove}
                isRestoring={isLoading}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            {versions.length} version{versions.length !== 1 ? 's' : ''} •
            Cmd/Ctrl+Z to undo in editor
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
