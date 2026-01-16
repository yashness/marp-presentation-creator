import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { X, Sparkles, Edit, Check, Trash2, GripVertical, RotateCcw } from 'lucide-react'
import type { PresentationOutline, SlideOutline } from '../api/client'
import { generateOutline, generateContent } from '../api/client'

const STORAGE_KEY = 'marp-ai-generation-state'

interface SavedState {
  step: 'input' | 'outline' | 'generating'
  description: string
  slideCount: string
  subtopicCount: string
  audience: string
  flavor: string
  narrationInstructions: string
  commentMaxRatio: string
  language: string
  outline: PresentationOutline | null
  timestamp: number
}

const LANGUAGES = [
  { code: '', label: 'English (Default)' },
  { code: 'Spanish', label: 'Spanish (Español)' },
  { code: 'French', label: 'French (Français)' },
  { code: 'German', label: 'German (Deutsch)' },
  { code: 'Italian', label: 'Italian (Italiano)' },
  { code: 'Portuguese', label: 'Portuguese (Português)' },
  { code: 'Chinese', label: 'Chinese (中文)' },
  { code: 'Japanese', label: 'Japanese (日本語)' },
  { code: 'Korean', label: 'Korean (한국어)' },
  { code: 'Hindi', label: 'Hindi (हिन्दी)' },
  { code: 'Arabic', label: 'Arabic (العربية)' },
  { code: 'Russian', label: 'Russian (Русский)' },
  { code: 'Dutch', label: 'Dutch (Nederlands)' },
  { code: 'Polish', label: 'Polish (Polski)' },
  { code: 'Swedish', label: 'Swedish (Svenska)' },
]

function loadSavedState(): Partial<SavedState> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const state = JSON.parse(saved) as SavedState
    // Only restore if saved within last hour
    if (Date.now() - state.timestamp > 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return state
  } catch {
    return null
  }
}

function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY)
}

interface AIGenerationModalProps {
  onClose: () => void
  onGenerate: (content: string, title: string) => void
}

export function AIGenerationModal({ onClose, onGenerate }: AIGenerationModalProps) {
  const savedState = loadSavedState()
  const [step, setStep] = useState<'input' | 'outline' | 'generating'>(savedState?.step === 'generating' ? 'outline' : (savedState?.step || 'input'))
  const [description, setDescription] = useState(savedState?.description || '')
  const [slideCount, setSlideCount] = useState(savedState?.slideCount || '')
  const [subtopicCount, setSubtopicCount] = useState(savedState?.subtopicCount || '')
  const [audience, setAudience] = useState(savedState?.audience || '')
  const [flavor, setFlavor] = useState(savedState?.flavor || '')
  const [narrationInstructions, setNarrationInstructions] = useState(savedState?.narrationInstructions || '')
  const [commentMaxRatio, setCommentMaxRatio] = useState(savedState?.commentMaxRatio || '')
  const [language, setLanguage] = useState(savedState?.language || '')
  const [outline, setOutline] = useState<PresentationOutline | null>(savedState?.outline || null)
  const [editingSlide, setEditingSlide] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasRestoredState, setHasRestoredState] = useState(!!savedState?.outline)

  // Save state to localStorage whenever it changes
  const saveState = useCallback(() => {
    const state: SavedState = {
      step,
      description,
      slideCount,
      subtopicCount,
      audience,
      flavor,
      narrationInstructions,
      commentMaxRatio,
      language,
      outline,
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [step, description, slideCount, subtopicCount, audience, flavor, narrationInstructions, commentMaxRatio, language, outline])

  useEffect(() => {
    saveState()
  }, [saveState])

  const handleClose = useCallback(() => {
    clearSavedState()
    onClose()
  }, [onClose])

  const handleClearAndRestart = useCallback(() => {
    clearSavedState()
    setStep('input')
    setDescription('')
    setSlideCount('')
    setSubtopicCount('')
    setAudience('')
    setFlavor('')
    setNarrationInstructions('')
    setCommentMaxRatio('')
    setLanguage('')
    setOutline(null)
    setHasRestoredState(false)
    setError(null)
  }, [])

  const handleGenerateOutline = async () => {
    if (!description.trim()) {
      setError('Please enter a description')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const parsedSlideCount = slideCount ? Number(slideCount) : undefined
      const parsedSubtopicCount = subtopicCount ? Number(subtopicCount) : undefined
      const parsedCommentRatio = commentMaxRatio ? Number(commentMaxRatio) / 100 : undefined
      const safeCommentRatio = parsedCommentRatio !== undefined && Number.isFinite(parsedCommentRatio)
        ? Math.min(1, Math.max(0.1, parsedCommentRatio))
        : undefined
      const result = await generateOutline(description, {
        slide_count: Number.isFinite(parsedSlideCount) ? parsedSlideCount : undefined,
        subtopic_count: Number.isFinite(parsedSubtopicCount) ? parsedSubtopicCount : undefined,
        audience: audience.trim() || undefined,
        flavor: flavor.trim() || undefined,
        narration_instructions: narrationInstructions.trim() || undefined,
        comment_max_ratio: safeCommentRatio,
        language: language || undefined,
      })
      setOutline(result)
      setStep('outline')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate outline')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePresentation = async () => {
    if (!outline) return

    setStep('generating')
    setError(null)

    try {
      const content = await generateContent(outline, 'professional', language || undefined)
      clearSavedState()
      onGenerate(content, outline.title)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate presentation')
      setStep('outline')
    }
  }

  const updateSlide = (index: number, updates: Partial<SlideOutline>) => {
    if (!outline) return
    const updated = { ...outline }
    updated.slides[index] = { ...updated.slides[index], ...updates }
    setOutline(updated)
  }

  const deleteSlide = (index: number) => {
    if (!outline) return
    const updated = { ...outline }
    updated.slides.splice(index, 1)
    setOutline(updated)
  }

  const addSlide = () => {
    if (!outline) return
    const updated = { ...outline }
    updated.slides.push({
      title: 'New Slide',
      content_points: ['Point 1', 'Point 2'],
      notes: ''
    })
    setOutline(updated)
  }

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    if (!outline) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= outline.slides.length) return

    const updated = { ...outline }
    const temp = updated.slides[index]
    updated.slides[index] = updated.slides[newIndex]
    updated.slides[newIndex] = temp
    setOutline(updated)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-neutral-950 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-neutral-200 dark:border-neutral-800"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 text-primary-700 border border-primary-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">AI Presentation Generator</h2>
              <p className="text-sm text-slate-500">
                {step === 'input' && 'Describe your presentation'}
                {step === 'outline' && 'Review and edit outline'}
                {step === 'generating' && 'Generating your presentation...'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Restored state banner */}
        {hasRestoredState && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary-600" />
              <span className="text-sm text-primary-800">
                Your previous AI generation session was restored.
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAndRestart}
              className="text-primary-700 hover:text-primary-900 hover:bg-primary-100"
            >
              Start Fresh
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What would you like to present?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g., 'Introduction to Machine Learning for beginners' or 'Q4 2024 Sales Report'"
                  className="w-full h-32 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Optional tuning</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Slide count</label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={slideCount}
                      onChange={(e) => setSlideCount(e.target.value)}
                      placeholder="e.g., 8"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Subtopic count</label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={subtopicCount}
                      onChange={(e) => setSubtopicCount(e.target.value)}
                      placeholder="e.g., 4"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Target audience</label>
                    <Input
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      placeholder="e.g., Product managers, beginners"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Extra flavor / angle</label>
                    <Input
                      value={flavor}
                      onChange={(e) => setFlavor(e.target.value)}
                      placeholder="e.g., practical, story-driven, skeptical"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Narration instructions</label>
                    <Input
                      value={narrationInstructions}
                      onChange={(e) => setNarrationInstructions(e.target.value)}
                      placeholder="e.g., upbeat, teach like a workshop, avoid jargon"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Max narration length (% of slide text)</label>
                    <Input
                      type="number"
                      min={10}
                      max={100}
                      value={commentMaxRatio}
                      onChange={(e) => setCommentMaxRatio(e.target.value)}
                      placeholder="90"
                    />
                  </div>
                </div>
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'outline' && outline && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Presentation Title</label>
                <Input
                  value={outline.title}
                  onChange={(e) => setOutline({ ...outline, title: e.target.value })}
                  className="text-lg font-semibold"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Slides ({outline.slides.length})</label>
                  <Button size="sm" onClick={addSlide}>Add Slide</Button>
                </div>

                {outline.slides.map((slide, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => moveSlide(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                        >
                          <GripVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>

                      <div className="flex-1 space-y-3">
                        {editingSlide === index ? (
                          <>
                            <Input
                              value={slide.title}
                              onChange={(e) => updateSlide(index, { title: e.target.value })}
                              placeholder="Slide title"
                            />
                            {slide.content_points.map((point, pIndex) => (
                              <div key={pIndex} className="flex gap-2">
                                <Input
                                  value={point}
                                  onChange={(e) => {
                                    const updated = [...slide.content_points]
                                    updated[pIndex] = e.target.value
                                    updateSlide(index, { content_points: updated })
                                  }}
                                  placeholder={`Point ${pIndex + 1}`}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    const updated = slide.content_points.filter((_, i) => i !== pIndex)
                                    updateSlide(index, { content_points: updated })
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const updated = [...slide.content_points, 'New point']
                                updateSlide(index, { content_points: updated })
                              }}
                            >
                              Add Point
                            </Button>
                            <textarea
                              value={slide.notes || ''}
                              onChange={(e) => updateSlide(index, { notes: e.target.value })}
                              placeholder="Audio narration (auto-generated; edit if needed)"
                              className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 text-sm"
                            />
                          </>
                        ) : (
                          <>
                            <h4 className="font-semibold text-slate-800">{slide.title}</h4>
                            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                              {slide.content_points.map((point, pIndex) => (
                                <li key={pIndex}>{point}</li>
                              ))}
                            </ul>
                            {slide.notes && (
                              <p className="text-xs text-slate-500 italic">{slide.notes}</p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingSlide(editingSlide === index ? null : index)}
                        >
                          {editingSlide === index ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Edit className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteSlide(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600">Creating your presentation...</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          <div className="flex gap-2">
            {step === 'outline' && (
              <Button variant="outline" onClick={() => setStep('input')}>
                Back
              </Button>
            )}

            {step === 'input' && (
              <Button onClick={handleGenerateOutline} disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Generate Outline'}
              </Button>
            )}

            {step === 'outline' && (
              <Button onClick={handleGeneratePresentation}>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Presentation
              </Button>
            )}
          </div>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
