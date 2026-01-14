import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { X, Sparkles, Edit, Check, Trash2, GripVertical } from 'lucide-react'
import type { PresentationOutline, SlideOutline } from '../api/client'
import { generateOutline, generateContent } from '../api/client'

interface AIGenerationModalProps {
  onClose: () => void
  onGenerate: (content: string, title: string) => void
}

export function AIGenerationModal({ onClose, onGenerate }: AIGenerationModalProps) {
  const [step, setStep] = useState<'input' | 'outline' | 'generating'>('input')
  const [description, setDescription] = useState('')
  const [outline, setOutline] = useState<PresentationOutline | null>(null)
  const [editingSlide, setEditingSlide] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerateOutline = async () => {
    if (!description.trim()) {
      setError('Please enter a description')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await generateOutline(description)
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
      const content = await generateContent(outline)
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
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
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

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
                              placeholder="Speaker notes (optional)"
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
          <Button variant="outline" onClick={onClose}>
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
      </div>
    </div>
  )
}
