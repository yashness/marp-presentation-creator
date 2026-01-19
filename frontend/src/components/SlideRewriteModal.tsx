import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Wand2, Loader2 } from 'lucide-react'
import { Button } from './ui/button'

interface SlideRewriteModalProps {
  isOpen: boolean
  onClose: () => void
  onRewrite: (instruction: string, length: 'short' | 'medium' | 'long') => Promise<void>
  onQuickRewrite: (instruction: string) => Promise<void>
  isLoading: boolean
}

const QUICK_PRESETS = ['Make concise', 'Add examples', 'Simplify', 'More detail']
const LENGTH_OPTIONS = ['short', 'medium', 'long'] as const

export function SlideRewriteModal({
  isOpen,
  onClose,
  onRewrite,
  onQuickRewrite,
  isLoading,
}: SlideRewriteModalProps) {
  const [instruction, setInstruction] = useState('')
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')

  const handleRewrite = async () => {
    if (!instruction.trim()) return
    await onRewrite(instruction, length)
    setInstruction('')
  }

  const handleQuickPreset = async (preset: string) => {
    setInstruction(preset)
    await onQuickRewrite(preset)
  }

  const handleClose = () => {
    setInstruction('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute right-0 top-full mt-2 z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-primary-100 text-primary-700 grid place-items-center">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">AI Rewrite Slide</p>
              <p className="text-xs text-slate-500">Describe how to change this slide</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="e.g., make it more concise, add examples..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRewrite()}
            className="w-full border border-secondary-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handleQuickPreset(preset)}
                className="px-2 py-1 text-xs bg-secondary-100 hover:bg-primary-100 text-secondary-600 hover:text-primary-700 rounded-md transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <span className="text-xs text-secondary-500 self-center">Length:</span>
            {LENGTH_OPTIONS.map((len) => (
              <button
                key={len}
                onClick={() => setLength(len)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  length === len
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-primary-100'
                }`}
              >
                {len.charAt(0).toUpperCase() + len.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRewrite}
              disabled={isLoading || !instruction.trim()}
              className="flex-1 bg-primary-700 hover:bg-primary-800"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rewrite'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
