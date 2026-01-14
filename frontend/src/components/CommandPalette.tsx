import { useState, useEffect, useRef } from 'react'
import { Sparkles, ImageIcon, X, Loader2 } from 'lucide-react'
import { generateImage } from '../api/client'
import { rewriteSlide } from '../api/client'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onInsertText: (text: string) => void
  currentSlideContent?: string
}

export function CommandPalette({ isOpen, onClose, onInsertText, currentSlideContent }: CommandPaletteProps) {
  const [mode, setMode] = useState<'menu' | 'ai-text' | 'ai-image'>('menu')
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, mode])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleClose = () => {
    setMode('menu')
    setPrompt('')
    setError(null)
    setIsLoading(false)
    onClose()
  }

  const handleGenerateText = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      setError('Please provide a detailed prompt (at least 10 characters)')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const instruction = prompt
      const content = await rewriteSlide(currentSlideContent || '# New Slide\n\n', instruction)
      onInsertText(content)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate text')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      setError('Please provide a detailed prompt (at least 10 characters)')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const imageData = await generateImage(prompt, '1024x1024', 'standard')
      const markdown = `\n\n![Generated image](data:image/png;base64,${imageData})\n\n`
      onInsertText(markdown)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'ai-text') {
      handleGenerateText()
    } else if (mode === 'ai-image') {
      handleGenerateImage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50" onClick={handleClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">
            {mode === 'menu' && 'AI Commands'}
            {mode === 'ai-text' && 'Generate Text with AI'}
            {mode === 'ai-image' && 'Generate Image with AI'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {mode === 'menu' && (
            <div className="space-y-2">
              <button
                onClick={() => setMode('ai-text')}
                className="w-full p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all flex items-start gap-4"
              >
                <Sparkles className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">Generate or Rewrite Text</div>
                  <div className="text-sm text-gray-500">
                    Use AI to generate new content or improve existing text
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('ai-image')}
                className="w-full p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-start gap-4"
              >
                <ImageIcon className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">Generate Image</div>
                  <div className="text-sm text-gray-500">
                    Create custom images with DALL-E for your slides
                  </div>
                </div>
              </button>
            </div>
          )}

          {(mode === 'ai-text' || mode === 'ai-image') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {mode === 'ai-text' ? 'What would you like to generate or change?' : 'Describe the image'}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === 'ai-text'
                      ? 'e.g., "Make it more concise" or "Add bullet points about AI"'
                      : 'e.g., "A futuristic city with flying cars at sunset"'
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setMode('menu')}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
