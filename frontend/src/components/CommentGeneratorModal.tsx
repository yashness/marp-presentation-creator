import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { Button } from './ui/button'

interface CommentGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (style: string) => Promise<void>
  isLoading: boolean
}

const STYLE_PRESETS = ['Conversational', 'Professional', 'Enthusiastic', 'Concise']

export function CommentGeneratorModal({
  isOpen,
  onClose,
  onGenerate,
  isLoading,
}: CommentGeneratorModalProps) {
  const [style, setStyle] = useState('')

  const handleGenerate = async () => {
    await onGenerate(style.trim() || 'professional')
    setStyle('')
  }

  const handlePresetClick = async (preset: string) => {
    setStyle(preset)
    await onGenerate(preset)
  }

  const handleClose = () => {
    setStyle('')
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
            <div className="h-8 w-8 rounded-lg bg-primary-100 text-primary-600 grid place-items-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Generate Comment</p>
              <p className="text-xs text-slate-500">AI will create narration based on slide content</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Style: e.g., conversational, formal, enthusiastic..."
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-primary-100 text-secondary-600 hover:text-primary-700 rounded-md transition-colors"
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
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex-1 bg-primary-600 hover:bg-primary-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
