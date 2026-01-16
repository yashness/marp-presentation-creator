import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Sparkles, X, Upload, Image, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { API_BASE_URL } from '../lib/constants'

// All 10 theme color properties with labels and descriptions
const THEME_COLOR_PROPERTIES = [
  { key: 'background', label: 'Background', description: 'Slide background color' },
  { key: 'text', label: 'Text', description: 'Main body text color' },
  { key: 'h1', label: 'Heading 1', description: 'Primary heading color' },
  { key: 'h2', label: 'Heading 2', description: 'Secondary heading color' },
  { key: 'h3', label: 'Heading 3', description: 'Tertiary heading color' },
  { key: 'link', label: 'Links', description: 'Hyperlink color' },
  { key: 'code_background', label: 'Inline Code BG', description: 'Inline code background' },
  { key: 'code_text', label: 'Inline Code Text', description: 'Inline code text color' },
  { key: 'code_block_background', label: 'Code Block BG', description: 'Code block background' },
  { key: 'code_block_text', label: 'Code Block Text', description: 'Code block text color' },
] as const

interface ThemeColors {
  background: string
  text: string
  h1: string
  h2: string
  h3: string
  link: string
  code_background: string
  code_text: string
  code_block_background: string
  code_block_text: string
}

const DEFAULT_THEME_COLORS: ThemeColors = {
  background: '#0b1024',
  text: '#e2e8f0',
  h1: '#0ea5e9',
  h2: '#7c3aed',
  h3: '#0ea5e9',
  link: '#38bdf8',
  code_background: '#0f172a',
  code_text: '#e2e8f0',
  code_block_background: '#111827',
  code_block_text: '#e5e7eb',
}

interface ThemeCreatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onThemeCreated?: () => void
}

export function ThemeCreatorModal({ open, onOpenChange, onThemeCreated }: ThemeCreatorModalProps) {
  const [themeName, setThemeName] = useState('')
  const [description, setDescription] = useState('')
  const [themeColors, setThemeColors] = useState<ThemeColors>({ ...DEFAULT_THEME_COLORS })
  const [extractedColors, setExtractedColors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setThemeName('')
      setDescription('')
      setThemeColors({ ...DEFAULT_THEME_COLORS })
      setExtractedColors([])
      setError(null)
      setPreviewImage(null)
      setShowAdvanced(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [open])

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setThemeColors(prev => ({ ...prev, [key]: value }))
  }

  const applyExtractedColor = (colorKey: keyof ThemeColors, extractedColor: string) => {
    updateColor(colorKey, extractedColor)
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
        setExtractedColors(data.colors)

        // Auto-apply first few colors to theme
        const colors = data.colors
        if (colors[0]) updateColor('h1', colors[0])
        if (colors[1]) updateColor('h2', colors[1])
        if (colors[2]) updateColor('link', colors[2])
        if (colors[3]) updateColor('h3', colors[3])

        // Detect if it's a dark or light theme based on first color
        if (colors[0]) {
          const hex = colors[0].replace('#', '')
          const r = parseInt(hex.substr(0, 2), 16)
          const g = parseInt(hex.substr(2, 2), 16)
          const b = parseInt(hex.substr(4, 2), 16)
          const brightness = (r * 299 + g * 587 + b * 114) / 1000

          // If the dominant color is dark, use it as background
          if (brightness < 128 && colors.length > 1) {
            updateColor('background', colors[0])
            updateColor('text', '#e2e8f0')
          }
        }

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
    setExtractedColors([])
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
      // Get brand colors from the theme colors (h1, h2, h3 are the main accent colors)
      const brandColors = [themeColors.h1, themeColors.h2, themeColors.h3, themeColors.link]
        .filter((c, i, arr) => arr.indexOf(c) === i) // unique

      const response = await fetch(`${API_BASE_URL}/api/themes/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_name: themeName,
          brand_colors: brandColors,
          description: description,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate theme')
      }

      const data = await response.json()

      if (data.success) {
        setThemeName('')
        setDescription('')
        setThemeColors({ ...DEFAULT_THEME_COLORS })
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

  // Simple preview of the theme
  const ThemePreview = () => (
    <div
      className="rounded-lg p-4 border"
      style={{ backgroundColor: themeColors.background, borderColor: themeColors.h1 + '40' }}
    >
      <h1 style={{ color: themeColors.h1, fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
        Heading 1
      </h1>
      <h2 style={{ color: themeColors.h2, fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
        Heading 2
      </h2>
      <p style={{ color: themeColors.text, fontSize: '12px', marginBottom: '6px' }}>
        Regular text content with <a style={{ color: themeColors.link }}>a link</a>.
      </p>
      <code
        style={{
          backgroundColor: themeColors.code_background,
          color: themeColors.code_text,
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px'
        }}
      >
        inline code
      </code>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary-700 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600" />
            AI Theme Creator
          </DialogTitle>
          <DialogDescription>
            Generate a custom Marp theme. Upload a screenshot to extract colors automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column - Settings */}
            <div className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Image className="w-4 h-4 inline mr-1" />
                  Extract Colors from Screenshot
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-primary-300 rounded-lg p-3 text-center hover:border-primary-500 transition-colors cursor-pointer"
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
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                      <span className="text-primary-600 text-sm">Analyzing...</span>
                    </div>
                  ) : previewImage ? (
                    <div className="relative">
                      <img src={previewImage} alt="Preview" className="max-h-20 mx-auto rounded" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); clearPreview(); }}
                        className="absolute top-0 right-0 text-red-600 hover:bg-red-50 h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="py-2">
                      <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-500">Drop or click to upload</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Extracted Colors Palette */}
              {extractedColors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Extracted Colors</label>
                  <div className="flex flex-wrap gap-2">
                    {extractedColors.map((color, i) => (
                      <div
                        key={i}
                        className="group relative w-8 h-8 rounded-lg border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Click a theme color below, then select from extracted colors</p>
                </div>
              )}

              {/* Theme Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Theme Name *</label>
                <Input
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="e.g., My Brand Theme"
                  className="w-full"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Style Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Modern and minimal, professional..."
                  rows={2}
                  className="w-full"
                />
              </div>
            </div>

            {/* Right Column - Colors & Preview */}
            <div className="space-y-4">
              {/* Primary Colors */}
              <div>
                <label className="block text-sm font-medium mb-2">Theme Colors</label>
                <div className="space-y-2">
                  {THEME_COLOR_PROPERTIES.slice(0, 6).map(({ key, label, description }) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          value={themeColors[key]}
                          onChange={(e) => updateColor(key, e.target.value)}
                          className="w-8 h-8 rounded border border-primary-200 cursor-pointer"
                        />
                        {extractedColors.length > 0 && (
                          <div className="absolute left-10 top-0 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                            {extractedColors.slice(0, 5).map((ec, i) => (
                              <button
                                key={i}
                                onClick={() => applyExtractedColor(key, ec)}
                                className="w-4 h-4 rounded border border-white shadow-sm hover:scale-125 transition-transform"
                                style={{ backgroundColor: ec }}
                                title={`Apply ${ec}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <Input
                        value={themeColors[key]}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="flex-1 h-8 text-xs font-mono"
                      />
                      <span className="text-xs text-gray-500 w-20 truncate" title={description}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Colors Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAdvanced ? 'Hide' : 'Show'} code colors
              </button>

              {showAdvanced && (
                <div className="space-y-2">
                  {THEME_COLOR_PROPERTIES.slice(6).map(({ key, label, description }) => (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeColors[key]}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="w-8 h-8 rounded border border-primary-200 cursor-pointer"
                      />
                      <Input
                        value={themeColors[key]}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="flex-1 h-8 text-xs font-mono"
                      />
                      <span className="text-xs text-gray-500 w-24 truncate" title={description}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <ThemePreview />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleGenerate}
              disabled={loading || !themeName.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Theme
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            AI will generate a complete Marp theme CSS based on your color selections
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
