import { useState } from 'react'
import { Button } from './ui/button'
import { ImageIcon, Loader2 } from 'lucide-react'
import { generateImage } from '../api/client'

interface ImageGenerationButtonProps {
  onImageGenerated?: (imageData: string) => void
}

export function ImageGenerationButton({ onImageGenerated }: ImageGenerationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [quality, setQuality] = useState('standard')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      setError('Please provide a detailed prompt (at least 10 characters)')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedImage(null)

    try {
      const imageData = await generateImage(prompt, size, quality)
      setGeneratedImage(imageData)
      if (onImageGenerated) {
        onImageGenerated(imageData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInsert = () => {
    if (generatedImage) {
      const markdown = `![Generated image](data:image/png;base64,${generatedImage})`
      navigator.clipboard.writeText(markdown)
      alert('Image markdown copied to clipboard! Paste it in your editor.')
      setIsOpen(false)
      resetForm()
    }
  }

  const resetForm = () => {
    setPrompt('')
    setGeneratedImage(null)
    setError(null)
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="secondary"
        size="sm"
        className="gap-2"
      >
        <ImageIcon className="w-4 h-4" />
        Generate Image
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Generate Image with AI</h2>
            <button
              onClick={() => {
                setIsOpen(false)
                resetForm()
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Description
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1024x1024">Square (1024x1024)</option>
                  <option value="1792x1024">Landscape (1792x1024)</option>
                  <option value="1024x1792">Portrait (1024x1792)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="hd">HD</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                {error}
              </div>
            )}

            {generatedImage && (
              <div className="border rounded-lg p-4">
                <img
                  src={`data:image/png;base64,${generatedImage}`}
                  alt="Generated"
                  className="w-full rounded-md"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              {!generatedImage ? (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="gap-2"
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
                  <Button
                    onClick={resetForm}
                    variant="secondary"
                  >
                    Generate Another
                  </Button>
                  <Button onClick={handleInsert}>
                    Copy Markdown
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
