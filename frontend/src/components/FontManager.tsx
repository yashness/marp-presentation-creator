import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { fetchFontFamilies, uploadFont, deleteFont, type FontFamily, type FontVariant } from '../api/client'
import { useApiHandler } from '../hooks/useApiHandler'
import { IconUpload, IconTrash, IconTypography, IconPlus, IconX } from '@tabler/icons-react'
import { cn } from '../lib/utils'

interface FontManagerProps {
  open: boolean
  onClose: () => void
  onFontAdded?: () => void
}

const FONT_WEIGHTS = [
  { value: '100', label: 'Thin (100)' },
  { value: '200', label: 'Extra Light (200)' },
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi Bold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra Bold (800)' },
  { value: '900', label: 'Black (900)' },
]

export function FontManager({ open, onClose, onFontAdded }: FontManagerProps) {
  const [families, setFamilies] = useState<FontFamily[]>([])
  const [loading, setLoading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [familyName, setFamilyName] = useState('')
  const [fontStyle, setFontStyle] = useState('normal')
  const [fontWeight, setFontWeight] = useState('400')
  const [uploading, setUploading] = useState(false)
  const { handleApiCall } = useApiHandler()

  const loadFonts = useCallback(async () => {
    setLoading(true)
    const result = await handleApiCall(
      () => fetchFontFamilies(),
      '',
      'Failed to load fonts'
    )
    if (result) {
      setFamilies(result)
    }
    setLoading(false)
  }, [handleApiCall])

  useEffect(() => {
    if (open) {
      loadFonts()
    }
  }, [open, loadFonts])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      // Auto-extract family name from filename
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      setFamilyName(name)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !familyName.trim()) return

    setUploading(true)
    const result = await handleApiCall(
      () => uploadFont(uploadFile, familyName.trim(), fontStyle, fontWeight),
      `Font "${familyName}" uploaded successfully`,
      'Failed to upload font'
    )
    setUploading(false)

    if (result) {
      setShowUploadForm(false)
      setUploadFile(null)
      setFamilyName('')
      setFontStyle('normal')
      setFontWeight('400')
      loadFonts()
      onFontAdded?.()
    }
  }

  const handleDelete = async (font: FontVariant) => {
    if (!confirm(`Delete font "${font.family_name}" (${font.weight} ${font.style})?`)) {
      return
    }

    await handleApiCall(
      () => deleteFont(font.id),
      'Font deleted',
      'Failed to delete font'
    )
    loadFonts()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconTypography className="w-5 h-5 text-primary-500" />
            Font Manager
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Upload Button */}
          {!showUploadForm && (
            <Button
              onClick={() => setShowUploadForm(true)}
              className="w-full"
              variant="outline"
            >
              <IconPlus className="w-4 h-4 mr-2" />
              Upload New Font
            </Button>
          )}

          {/* Upload Form */}
          {showUploadForm && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Upload Font</h3>
                <button
                  onClick={() => {
                    setShowUploadForm(false)
                    setUploadFile(null)
                    setFamilyName('')
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Font File (.ttf, .otf, .woff, .woff2)</label>
                  <Input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Font Family Name</label>
                  <Input
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="e.g., My Custom Font"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Weight</label>
                    <Select
                      value={fontWeight}
                      onChange={(e) => setFontWeight(e.target.value)}
                      className="mt-1"
                    >
                      {FONT_WEIGHTS.map(w => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Style</label>
                    <Select
                      value={fontStyle}
                      onChange={(e) => setFontStyle(e.target.value)}
                      className="mt-1"
                    >
                      <option value="normal">Normal</option>
                      <option value="italic">Italic</option>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!uploadFile || !familyName.trim() || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>Uploading...</>
                  ) : (
                    <>
                      <IconUpload className="w-4 h-4 mr-2" />
                      Upload Font
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Font List */}
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading fonts...</div>
          ) : families.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <IconTypography className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No custom fonts uploaded yet</p>
              <p className="text-xs mt-1">Upload .ttf, .otf, .woff, or .woff2 files</p>
            </div>
          ) : (
            <div className="space-y-3">
              {families.map(family => (
                <div
                  key={family.family_name}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3
                      className="font-semibold text-lg"
                      style={{ fontFamily: family.css_family }}
                    >
                      {family.family_name}
                    </h3>
                    <code className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {family.css_family}
                    </code>
                  </div>

                  <div className="space-y-1">
                    {family.variants.map(variant => (
                      <div
                        key={variant.id}
                        className={cn(
                          "flex items-center justify-between py-2 px-3 rounded-md",
                          "bg-slate-50 dark:bg-slate-800/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="text-sm"
                            style={{
                              fontFamily: family.css_family,
                              fontWeight: variant.weight,
                              fontStyle: variant.style
                            }}
                          >
                            {variant.weight} {variant.style !== 'normal' && variant.style}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatSize(variant.size_bytes)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(variant)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
