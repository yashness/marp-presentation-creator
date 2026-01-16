import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Sparkles, Plus, X, Upload, Image, Loader2 } from 'lucide-react'
import { API_BASE_URL } from '../lib/constants'

interface ColorNames {
  [key: string]: string
}

interface ThemeCreatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onThemeCreated?: () => void
}

export function ThemeCreatorModal({ open, onOpenChange, onThemeCreated }: ThemeCreatorModalProps) {
  const [themeName, setThemeName] = useState('')
  const [description, setDescription] = useState('')
  const [colors, setColors] = useState<string[]>(['#3B82F6', '#8B5CF6'])
  const [colorNames, setColorNames] = useState<ColorNames>({})
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addColor = () => {
    if (colors.length < 6) {
      setColors([...colors, '#000000'])
    }
  }

  const removeColor = (index: number) => {
    if (colors.length > 1) {
      setColors(colors.filter((_, i) => i !== index))
    }
  }

  const updateColor = (index: number, value: string) => {
    const newColors = [...colors]
    newColors[index] = value
    setColors(newColors)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Extract colors
    setExtracting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/api/themes/extract-colors`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to extract colors')
      }

      const data = await response.json()

      if (data.success && data.colors.length > 0) {
        setColors(data.colors)
        setColorNames(data.color_names || {})
        if (data.description && !description) {
          setDescription(data.description)
        }
      } else {
        setError(data.message || 'No colors could be extracted')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract colors')
    } finally {
      setExtracting(false)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files
        handleImageUpload({ target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>)
      }
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const clearPreview = () => {
    setPreviewImage(null)
    setColorNames({})
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleGenerate = async () => {
    if (!themeName.trim()) {
      setError('Theme name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/themes/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_name: themeName,
          brand_colors: colors,
          description: description,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate theme')
      }

      const data = await response.json()

      if (data.success) {
        // Reset form
        setThemeName('')
        setDescription('')
        setColors(['#3B82F6', '#8B5CF6'])
        onThemeCreated?.()
        onOpenChange(false)
      } else {
        setError(data.message || 'Failed to generate theme')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary-700 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600" />
            AI Theme Creator
          </DialogTitle>
          <DialogDescription>
            Generate a custom Marp theme based on your brand colors and style
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Image className="w-4 h-4 inline mr-1" />
              Extract Colors from Screenshot
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-primary-300 rounded-lg p-4 text-center hover:border-primary-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
              />
              {extracting ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  <span className="text-primary-600">Analyzing image...</span>
                </div>
              ) : previewImage ? (
                <div className="relative">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="max-h-32 mx-auto rounded"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); clearPreview(); }}
                    className="absolute top-0 right-0 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    Drop a screenshot or click to upload
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    AI will extract the color palette automatically
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Theme Name *</label>
            <Input
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="e.g., My Brand Theme"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Brand Colors *</label>
            <div className="space-y-2">
              {colors.map((color, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    className="w-12 h-10 rounded border border-primary-200 cursor-pointer"
                  />
                  <Input
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                  {colorNames[color.toUpperCase()] && (
                    <span className="text-xs text-gray-500 min-w-[80px]">
                      {colorNames[color.toUpperCase()]}
                    </span>
                  )}
                  {colors.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeColor(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {colors.length < 8 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addColor}
                  className="w-full"
                >
                  <Plus className="w-4 h-4" />
                  Add Color
                </Button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Style Description (Optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Modern and minimal, professional corporate, creative and bold..."
              rows={3}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleGenerate}
              disabled={loading || !themeName.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Theme
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            AI will generate a complete Marp theme CSS based on your inputs
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
