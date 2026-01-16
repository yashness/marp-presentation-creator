import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './ui/button'
import {
  Sparkles,
  Shuffle,
  Mic,
  RefreshCw,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react'

interface AIActionsMenuProps {
  onCommandPaletteOpen: () => void
  onTransformOpen: () => void
  onGenerateCommentary: () => void
  onRegenerateComments: () => void
  isCommentaryLoading: boolean
  isRegeneratingLoading: boolean
  disabled: boolean
}

export function AIActionsMenu({
  onCommandPaletteOpen,
  onTransformOpen,
  onGenerateCommentary,
  onRegenerateComments,
  isCommentaryLoading,
  isRegeneratingLoading,
  disabled,
}: AIActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        <Sparkles className="w-4 h-4" />
        AI Actions
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <span className="font-semibold text-slate-800 text-sm">AI Actions</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-6 w-6 p-0">
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    onCommandPaletteOpen()
                    setIsOpen(false)
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-primary-50 transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary-100 text-primary-600 grid place-items-center flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">AI Commands</p>
                    <p className="text-xs text-slate-500">Insert diagrams, tables, and more</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onTransformOpen()
                    setIsOpen(false)
                  }}
                  disabled={disabled}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-primary-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-600 grid place-items-center flex-shrink-0">
                    <Shuffle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Transform</p>
                    <p className="text-xs text-slate-500">Rearrange, restyle, rewrite</p>
                  </div>
                </button>

                <div className="border-t border-slate-100 my-2" />

                <button
                  onClick={() => {
                    onGenerateCommentary()
                    setIsOpen(false)
                  }}
                  disabled={disabled || isCommentaryLoading}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-primary-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="h-9 w-9 rounded-lg bg-purple-100 text-purple-600 grid place-items-center flex-shrink-0">
                    {isCommentaryLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Generate Commentary</p>
                    <p className="text-xs text-slate-500">Audio-ready narration for all slides</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onRegenerateComments()
                    setIsOpen(false)
                  }}
                  disabled={disabled || isRegeneratingLoading}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-primary-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="h-9 w-9 rounded-lg bg-green-100 text-green-600 grid place-items-center flex-shrink-0">
                    {isRegeneratingLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Regenerate Comments</p>
                    <p className="text-xs text-slate-500">Refresh all slide comments</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
