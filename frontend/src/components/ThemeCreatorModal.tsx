import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Sparkles, Plus, X } from 'lucide-react'
import { API_BASE_URL } from '../lib/constants'

interface ThemeCreatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onThemeCreated?: () => void
}

export function ThemeCreatorModal({ open, onOpenChange, onThemeCreated }: ThemeCreatorModalProps) {
  const [themeName, setThemeName] = useState('')
  const [description, setDescription] = useState('')
  const [colors, setColors] = useState<string[]>(['#3B82F6', '#8B5CF6'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
              {colors.length < 6 && (
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
