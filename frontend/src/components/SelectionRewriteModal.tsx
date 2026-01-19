import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Wand2, Loader2 } from 'lucide-react'
import { Button } from './ui/button'

interface SelectionRewriteModalProps {
  isOpen: boolean
  selectedText: string
  onClose: () => void
  onRewrite: (instruction: string) => Promise<void>
  isLoading: boolean
}

const REWRITE_PRESETS = ['Simplify', 'Expand', 'Make formal', 'Make casual']

export function SelectionRewriteModal({
  isOpen,
  selectedText,
  onClose,
  onRewrite,
  isLoading,
}: SelectionRewriteModalProps) {
  const [instruction, setInstruction] = useState('')

  const handleRewrite = async () => {
    if (!instruction.trim()) return
    await onRewrite(instruction)
    setInstruction('')
  }

  const handleClose = () => {
    setInstruction('')
    onClose()
  }

  const displayText = selectedText.length > 100
    ? selectedText.slice(0, 100) + '...'
    : selectedText

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute top-12 right-4 z-30 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-secondary-100 text-secondary-700 grid place-items-center">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Rewrite Selection</p>
              <p className="text-xs text-slate-500">Modify only the selected text</p>
            </div>
          </div>
          <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Selected text:</p>
            <p className="text-sm text-slate-700 line-clamp-2 font-mono">"{displayText}"</p>
          </div>
          <input
            type="text"
            placeholder="e.g., make it shorter, add emphasis..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRewrite()}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {REWRITE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setInstruction(preset)}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-secondary-100 text-slate-600 hover:text-secondary-700 rounded-md transition-colors"
              >
                {preset}
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
              className="flex-1 bg-secondary-600 hover:bg-secondary-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rewrite'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
