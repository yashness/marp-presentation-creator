import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  rearrangeSlides,
  transformStyle,
  rewriteForTopic,
  type TransformStyle,
} from '../api/client'
import { useToast } from '../contexts/ToastContext'
import {
  Wand2,
  BookOpen,
  GraduationCap,
  Presentation,
  Users,
  Code,
  Briefcase,
  Shuffle,
  RefreshCw,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react'

interface TransformMenuProps {
  isOpen: boolean
  onClose: () => void
  slides: string[]
  onTransformed: (slides: string[]) => void
}

const TRANSFORM_STYLES: {
  key: TransformStyle
  name: string
  icon: React.ReactNode
  description: string
}[] = [
  {
    key: 'story',
    name: 'Storify',
    icon: <BookOpen className="w-5 h-5" />,
    description: 'Convert to narrative arc with characters and conflict',
  },
  {
    key: 'teaching',
    name: 'Teaching',
    icon: <GraduationCap className="w-5 h-5" />,
    description: 'Educational style with objectives and exercises',
  },
  {
    key: 'pitch',
    name: 'Pitch Deck',
    icon: <Presentation className="w-5 h-5" />,
    description: 'Problem, solution, traction, team, ask format',
  },
  {
    key: 'workshop',
    name: 'Workshop',
    icon: <Users className="w-5 h-5" />,
    description: 'Activities, discussions, hands-on exercises',
  },
  {
    key: 'technical',
    name: 'Technical',
    icon: <Code className="w-5 h-5" />,
    description: 'Documentation style with specs and code examples',
  },
  {
    key: 'executive',
    name: 'Executive',
    icon: <Briefcase className="w-5 h-5" />,
    description: 'Key insights, metrics, recommendations',
  },
]

export function TransformMenu({
  isOpen,
  onClose,
  slides,
  onTransformed,
}: TransformMenuProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showRewrite, setShowRewrite] = useState(false)
  const [newTopic, setNewTopic] = useState('')
  const [keepStyle, setKeepStyle] = useState(true)
  const { showToast } = useToast()

  const handleRearrange = useCallback(async () => {
    setLoading('rearrange')
    try {
      const result = await rearrangeSlides(slides)
      onTransformed(result)
      onClose()
      showToast('Slides rearranged for better flow', 'success')
    } catch (error) {
      console.error('Failed to rearrange:', error)
      showToast('Failed to rearrange slides', 'error')
    } finally {
      setLoading(null)
    }
  }, [slides, onTransformed, onClose, showToast])

  const handleTransform = useCallback(
    async (style: TransformStyle) => {
      setLoading(style)
      try {
        const result = await transformStyle(slides, style)
        onTransformed(result)
        onClose()
        showToast(`Transformed to ${style} style`, 'success')
      } catch (error) {
        console.error('Failed to transform:', error)
        showToast('Failed to transform slides', 'error')
      } finally {
        setLoading(null)
      }
    },
    [slides, onTransformed, onClose, showToast]
  )

  const handleRewriteForTopic = useCallback(async () => {
    if (!newTopic.trim()) return
    setLoading('rewrite')
    try {
      const result = await rewriteForTopic(slides, newTopic.trim(), keepStyle)
      onTransformed(result)
      onClose()
      setNewTopic('')
      setShowRewrite(false)
      showToast('Slides rewritten for new topic', 'success')
    } catch (error) {
      console.error('Failed to rewrite:', error)
      showToast('Failed to rewrite slides', 'error')
    } finally {
      setLoading(null)
    }
  }, [slides, newTopic, keepStyle, onTransformed, onClose, showToast])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="absolute right-0 top-full mt-2 z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-slate-800">Transform</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-3 space-y-2">
            {/* Rearrange button */}
            <button
              onClick={handleRearrange}
              disabled={loading !== null || slides.length < 2}
              className="flex items-center gap-3 w-full p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left disabled:opacity-50"
            >
              <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 grid place-items-center flex-shrink-0">
                {loading === 'rearrange' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Shuffle className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  AI Rearrange
                </p>
                <p className="text-xs text-slate-500">
                  Optimize slide order for better flow
                </p>
              </div>
            </button>

            {/* Rewrite for topic button */}
            <button
              onClick={() => setShowRewrite(!showRewrite)}
              disabled={loading !== null}
              className="flex items-center justify-between w-full p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 grid place-items-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Rewrite for Topic
                  </p>
                  <p className="text-xs text-slate-500">
                    Keep style, change content
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  showRewrite ? 'rotate-90' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {showRewrite && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                    <Input
                      placeholder="Enter new topic..."
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleRewriteForTopic()
                      }
                    />
                    <div className="flex items-center gap-2">
                      <input
                        id="keep-style"
                        type="checkbox"
                        checked={keepStyle}
                        onChange={(e) => setKeepStyle(e.target.checked)}
                        className="rounded border-slate-300 text-primary-600"
                      />
                      <label
                        htmlFor="keep-style"
                        className="text-sm text-slate-600"
                      >
                        Keep original style & structure
                      </label>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleRewriteForTopic}
                      disabled={!newTopic.trim() || loading === 'rewrite'}
                      className="w-full"
                    >
                      {loading === 'rewrite' ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Rewrite All Slides
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border-t border-slate-200 pt-2 mt-2">
              <p className="text-xs text-slate-500 px-1 mb-2">Quick Styles</p>
              <div className="grid grid-cols-2 gap-2">
                {TRANSFORM_STYLES.map((style) => (
                  <button
                    key={style.key}
                    onClick={() => handleTransform(style.key)}
                    disabled={loading !== null}
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left disabled:opacity-50"
                  >
                    <div className="h-8 w-8 rounded-md bg-primary-100 text-primary-600 grid place-items-center flex-shrink-0">
                      {loading === style.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        style.icon
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {style.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
