import { useState, useCallback } from 'react'
import { Button } from './ui/button'
import { ImageIcon, Loader2, X, Copy, Check } from 'lucide-react'
import { generateImage } from '../api/client'
import { AnimatePresence, motion } from 'motion/react'

interface SlideImageButtonProps {
  slideContent: string
  onImageInsert: (markdown: string) => void
}

export function SlideImageButton({ slideContent, onImageInsert }: SlideImageButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const extractContext = useCallback(() => {
    const lines = slideContent.split('\n').filter(l => l.trim())
    const title = lines.find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || ''
    const bullets = lines.filter(l => l.startsWith('-') || l.startsWith('*'))
      .map(l => l.replace(/^[-*]\s*/, '').replace(/\*\*/g, ''))
      .slice(0, 3)
      .join(', ')
    return `${title}${bullets ? ': ' + bullets : ''}`
  }, [slideContent])

  const handleOpen = () => {
    setIsOpen(true)
    setPrompt(`Create a professional presentation visual for: ${extractContext()}`)
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      setError('Please provide a detailed prompt (at least 10 characters)')
      return
    }
    setIsGenerating(true)
    setError(null)
    setGeneratedImage(null)

    try {
      const imageData = await generateImage(prompt, '1024x1024', 'standard')
      setGeneratedImage(imageData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInsert = () => {
    if (generatedImage) {
      const markdown = `![Generated image](data:image/png;base64,${generatedImage})`
      onImageInsert(markdown)
      setIsOpen(false)
      resetForm()
    }
  }

  const handleCopy = () => {
    if (generatedImage) {
      const markdown = `![Generated image](data:image/png;base64,${generatedImage})`
      navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetForm = () => {
    setPrompt('')
    setGeneratedImage(null)
    setError(null)
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        size="sm"
        variant="outline"
        className="text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
      >
        <ImageIcon className="w-3.5 h-3.5" />
        AI Image
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => { setIsOpen(false); resetForm() }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 grid place-items-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">Generate Slide Image</h2>
                    <p className="text-xs text-slate-500">AI-powered image based on slide content</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setIsOpen(false); resetForm() }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Image Description
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    rows={3}
                  />
                  <p className="text-xs text-slate-500 mt-1">Pre-filled based on slide content. Edit as needed.</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {generatedImage && (
                  <div className="border rounded-xl overflow-hidden">
                    <img
                      src={`data:image/png;base64,${generatedImage}`}
                      alt="Generated"
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex gap-2 justify-end">
                {!generatedImage ? (
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        Generate
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button onClick={resetForm} variant="outline">
                      Generate Another
                    </Button>
                    <Button onClick={handleCopy} variant="outline" className="gap-2">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button onClick={handleInsert} className="bg-emerald-600 hover:bg-emerald-700">
                      Insert into Slide
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
