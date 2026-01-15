import { useEffect, useMemo, useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import type { Theme, ThemeCreatePayload } from '../api/client'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { ExportButton } from './ExportButton'
import { VideoExportButton } from './VideoExportButton'
import { AutosaveStatusIndicator } from './AutosaveStatusIndicator'
import { TTSButton } from './TTSButton'
import { ImageGenerationButton } from './ImageGenerationButton'
import { CommandPalette } from './CommandPalette'
import { ThemeCreatorModal } from './ThemeCreatorModal'
import { Info, LayoutTemplate, MessageSquarePlus, Sparkles, SlidersHorizontal, X, Download, Palette } from 'lucide-react'
import { Button } from './ui/button'
import { parseSlides, serializeSlides } from '../lib/markdown'
import type { SlideBlock } from '../lib/markdown'
import { DEFAULT_THEME, DEFAULT_TITLE } from '../lib/constants'
import { DEFAULT_THEME_TEMPLATE } from '../lib/themeDefaults'

interface EditorPanelProps {
  title: string
  content: string
  selectedTheme: string | null
  selectedId: string | null
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  themes: Theme[]
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onThemeChange: (theme: string | null) => void
  onExport: (format: 'pdf' | 'html' | 'pptx') => void
  onCreateTheme: (data: ThemeCreatePayload) => Promise<Theme | null>
  onUpdateTheme: (id: string, data: ThemeCreatePayload) => Promise<Theme | null>
  onDeleteTheme: (id: string) => Promise<void | null>
}

interface ExportButtonGroupProps {
  selectedId: string | null
  presentationTitle: string
  onExport: (format: 'pdf' | 'html' | 'pptx') => void
}

function ExportButtonGroup({ selectedId, presentationTitle, onExport }: ExportButtonGroupProps) {
  return (
    <>
      <ExportButton format="pdf" onClick={onExport} disabled={!selectedId} />
      <ExportButton format="html" onClick={onExport} disabled={!selectedId} />
      <ExportButton format="pptx" onClick={onExport} disabled={!selectedId} />
      <VideoExportButton presentationId={selectedId} presentationTitle={presentationTitle} />
    </>
  )
}

export function EditorPanel({
  title,
  content,
  selectedTheme,
  selectedId,
  autosaveStatus,
  themes,
  onTitleChange,
  onContentChange,
  onThemeChange,
  onExport,
  onCreateTheme,
  onUpdateTheme,
  onDeleteTheme,
}: EditorPanelProps) {
  const [mode, setMode] = useState<'blocks' | 'raw'>('blocks')
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [themeDraft, setThemeDraft] = useState<ThemeCreatePayload>({ ...DEFAULT_THEME_TEMPLATE, name: '' })
  const [themeStatus, setThemeStatus] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0)
  const [themeCreatorOpen, setThemeCreatorOpen] = useState(false)

  const parsed = useMemo(() => parseSlides(content), [content])
  const slides = parsed.slides.length
    ? parsed.slides
    : [{ id: 'slide-0', content: '# New Slide', comment: '' }]
  const customThemes = useMemo(() => themes.filter(t => !t.is_builtin), [themes])

  const normalizedFrontmatter = useMemo(() => {
    const fm = { ...parsed.frontmatter }
    fm.marp = 'true'
    fm.title = (title && title.trim()) || fm.title || DEFAULT_TITLE
    fm.theme = selectedTheme || fm.theme || DEFAULT_THEME
    fm.paginate = fm.paginate || 'true'
    fm.footer = fm.footer ?? ''
    return fm
  }, [parsed.frontmatter, selectedTheme, title])

  useEffect(() => {
    setOpenComments(prev => {
      const next = { ...prev }
      slides.forEach((slide) => {
        if (slide.comment && slide.comment.trim().length > 0) {
          next[slide.id] = true
        }
      })
      return next
    })
  }, [slides])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [settingsOpen])

  const updateContent = useCallback((updatedSlides: SlideBlock[], overrides?: Record<string, string>) => {
    const fm = { ...normalizedFrontmatter, ...overrides }
    fm.marp = fm.marp || 'true'
    fm.title = fm.title || DEFAULT_TITLE
    fm.theme = fm.theme || DEFAULT_THEME
    fm.paginate = fm.paginate || 'true'
    const serialized = serializeSlides(fm, updatedSlides)
    onContentChange(serialized)
  }, [normalizedFrontmatter, onContentChange])

  const handleSlideChange = useCallback((index: number, value: string) => {
    const nextSlides = slides.map((slide, i) =>
      i === index ? { ...slide, content: value } : slide
    )
    updateContent(nextSlides)
  }, [slides, updateContent])

  const handleCommentChange = useCallback((index: number, value: string) => {
    const nextSlides = slides.map((slide, i) =>
      i === index ? { ...slide, comment: value } : slide
    )
    updateContent(nextSlides)
  }, [slides, updateContent])

  const handleTitleInput = (value: string) => {
    onTitleChange(value)
    updateContent(slides, { title: value.trim() || DEFAULT_TITLE })
  }

  const handleThemeChange = (value: string) => {
    const normalized = value || DEFAULT_THEME
    onThemeChange(value || null)
    updateContent(slides, { theme: normalized })
  }

  const handlePaginateChange = (checked: boolean) => {
    updateContent(slides, { paginate: checked ? 'true' : 'false' })
  }

  const handleFooterChange = (value: string) => {
    updateContent(slides, { footer: value })
  }

  const handleAddSlide = () => {
    const index = slides.length + 1
    const nextSlides = [
      ...slides,
      {
        id: `slide-${Date.now()}`,
        content: `# Slide ${index}\n\nAdd talking points here.`,
        comment: '',
      },
    ]
    updateContent(nextSlides)
  }

  const toggleCommentVisibility = (id: string) => {
    setOpenComments(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleInsertText = useCallback((text: string) => {
    if (mode === 'blocks' && currentSlideIndex >= 0 && currentSlideIndex < slides.length) {
      const slide = slides[currentSlideIndex]
      const updatedContent = slide.content + '\n\n' + text
      handleSlideChange(currentSlideIndex, updatedContent)
    } else if (mode === 'raw') {
      onContentChange(content + '\n\n' + text)
    }
  }, [mode, currentSlideIndex, slides, content, onContentChange])

  const updateThemeDraft = (section: 'colors' | 'typography' | 'spacing', key: string, value: string) => {
    setThemeDraft(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }))
  }

  const loadThemeIntoDraft = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId)
    if (!theme || !theme.colors || !theme.typography || !theme.spacing) {
      setThemeStatus('Unable to load theme for editing.')
      return
    }
    setEditingThemeId(themeId)
    setThemeDraft({
      name: theme.name,
      description: theme.description || '',
      colors: { ...theme.colors },
      typography: { ...theme.typography },
      spacing: { ...theme.spacing },
    })
    setThemeStatus(`Editing theme: ${theme.name}`)
  }

  const resetThemeDraft = () => {
    setEditingThemeId(null)
    setThemeDraft({ ...DEFAULT_THEME_TEMPLATE, name: '' })
  }

  const handleSaveTheme = async () => {
    setThemeStatus(null)
    const payload = {
      ...themeDraft,
      name: themeDraft.name.trim() || 'Custom Theme',
    }
    const operation = editingThemeId
      ? () => onUpdateTheme(editingThemeId, payload)
      : () => onCreateTheme(payload)
    const saved = await operation()
    if (!saved) {
      setThemeStatus('Could not save theme. Please try again.')
      return
    }

    setThemeStatus(editingThemeId ? 'Theme updated.' : 'Theme created and applied to this deck.')
    onThemeChange(saved.id)
    updateContent(slides, { theme: saved.id })
    if (!editingThemeId) {
      resetThemeDraft()
    }
  }

  const handleDeleteTheme = async () => {
    if (!editingThemeId) return
    const theme = themes.find(t => t.id === editingThemeId)
    if (theme?.is_builtin) return
    await onDeleteTheme(editingThemeId)
    if (selectedTheme === editingThemeId) {
      onThemeChange(DEFAULT_THEME)
      updateContent(slides, { theme: DEFAULT_THEME })
    }
    resetThemeDraft()
    setThemeStatus('Theme deleted.')
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden relative bg-gradient-to-br from-white/50 to-primary-50/30">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg shadow-md">
              <LayoutTemplate className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-secondary-600 bg-clip-text text-transparent">Presentation Builder</h1>
          </div>
          <p className="text-sm text-primary-600 flex items-center gap-2 ml-14">
            <Info className="w-4 h-4" />
            Structured slide blocks or full editor mode. Frontmatter stays in the controls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AutosaveStatusIndicator status={autosaveStatus} />
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <Button
              variant={mode === 'blocks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('blocks')}
              className="rounded-none"
            >
              Blocks view
            </Button>
            <Button
              variant={mode === 'raw' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMode('raw')}
              className="rounded-none border-l border-slate-200"
            >
              Editor view
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="hidden md:inline-flex">
            <SlidersHorizontal className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-primary-200/50 p-4 shadow-lg mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,260px,auto] gap-3 items-center">
          <Input
            type="text"
            placeholder="Presentation Title"
            value={title}
            onChange={(e) => handleTitleInput(e.target.value)}
            className="w-full"
          />
          <Select value={selectedTheme || ''} onChange={(e) => handleThemeChange(e.target.value)}>
            <option value="">Default Theme</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </Select>
          <Button onClick={handleAddSlide} size="sm" className="whitespace-nowrap justify-self-start md:justify-self-end">
            <MessageSquarePlus className="w-4 h-4" />
            Add slide
          </Button>
          <Button onClick={() => setCommandPaletteOpen(true)} size="sm" variant="secondary" className="whitespace-nowrap gap-2">
            <Sparkles className="w-4 h-4" />
            AI Commands
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs bg-gray-200 rounded">⌘K</kbd>
          </Button>
          <ImageGenerationButton />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={normalizedFrontmatter.paginate === 'true'}
              onChange={(e) => handlePaginateChange(e.target.checked)}
            />
            Paginate slides
          </label>
          <textarea
            className="flex-1 min-w-[200px] h-10 px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none"
            placeholder="Footer text (supports spaces and new lines)"
            value={normalizedFrontmatter.footer || ''}
            onChange={(e) => handleFooterChange(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="md:hidden">
            <SlidersHorizontal className="w-4 h-4" />
            Settings
          </Button>
        </div>

        <p className="text-xs text-slate-500">
          Frontmatter (marp, title, theme, paginate, footer) stays in sync as you edit — no YAML required.
        </p>
      </div>

      <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-primary-200/50 overflow-hidden">
        {mode === 'blocks' ? (
          <div className="h-full overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-slate-50 to-primary-50/20">
            {slides.map((slide, index) => (
              <div key={slide.id} className="bg-white rounded-xl border border-primary-200/50 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-50 to-secondary-50 border-b border-primary-200/50">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Slide {index + 1}</p>
                    <p className="text-sm text-slate-700 truncate">
                      {(slide.content.split('\n').find(line => line.trim().length > 0) || '# Heading').replace(/^#+\s*/, '')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCommentVisibility(slide.id)}
                      className="text-secondary-700"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                      {openComments[slide.id] ? 'Hide comment' : 'Add comment'}
                    </Button>
                  </div>
                </div>
                {openComments[slide.id] && (
                  <div className="p-3 border-b border-primary-200/50 bg-gradient-to-r from-secondary-50 to-primary-50 space-y-3">
                    <textarea
                      className="w-full h-24 p-3 rounded-md border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Add slide comment or reviewer note"
                      value={slide.comment || ''}
                      onChange={(e) => handleCommentChange(index, e.target.value)}
                    />
                    <TTSButton
                      presentationId={selectedId}
                      slideIndex={index}
                      commentText={slide.comment || ''}
                      onAudioGenerated={(url) => console.log('Audio generated:', url)}
                    />
                  </div>
                )}
                <div onFocus={() => setCurrentSlideIndex(index)}>
                  <Editor
                    height="200px"
                    language="markdown"
                    value={slide.content}
                    onChange={(value) => handleSlideChange(index, value || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'off',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      roundedSelection: false,
                    }}
                  />
                </div>
              </div>
            ))}
            <Button onClick={handleAddSlide} variant="outline" className="w-full border-dashed">
              <MessageSquarePlus className="w-4 h-4" />
              Add another slide
            </Button>
          </div>
        ) : (
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={content}
            onChange={(value) => onContentChange(value || '')}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
            }}
          />
        )}
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 bg-black/30 flex justify-end z-50" onClick={() => setSettingsOpen(false)}>
          <div
            className="w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Settings</p>
                  <p className="text-xs text-slate-500">Exports and theme lab live here.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="rounded-lg border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-primary-500" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Exports</p>
                      <p className="text-sm text-slate-700">Download your deck</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ExportButtonGroup selectedId={selectedId} presentationTitle={title} onExport={onExport} />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Use structured editing to keep slides tidy, then switch to editor view for raw tweaks.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 bg-gradient-to-br from-primary-50 to-secondary-50 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-secondary-600" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Theme Studio</p>
                      <p className="text-sm text-slate-700">Create, edit, or delete custom themes.</p>
                    </div>
                  </div>
                  <Sparkles className="w-5 h-5 text-secondary-500" />
                </div>
                <Button
                  size="sm"
                  onClick={() => setThemeCreatorOpen(true)}
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Theme Creator
                </Button>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-600">Load existing custom theme</label>
                  <Select
                    value={editingThemeId || ''}
                    onChange={(e) => {
                      const id = e.target.value
                      if (!id) {
                        resetThemeDraft()
                        setThemeStatus(null)
                        return
                      }
                      loadThemeIntoDraft(id)
                    }}
                  >
                    <option value="">Start fresh</option>
                    {customThemes.map(theme => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        resetThemeDraft()
                        setThemeStatus('Draft reset')
                      }}
                    >
                      Reset draft
                    </Button>
                    {editingThemeId && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={handleDeleteTheme}
                      >
                        Delete theme
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-slate-600">Theme name</label>
                    <Input
                      type="text"
                      placeholder="Theme name"
                      value={themeDraft.name}
                      onChange={(e) => setThemeDraft(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-slate-600">Description</label>
                    <Input
                      type="text"
                      placeholder="Description"
                      value={themeDraft.description || ''}
                      onChange={(e) => setThemeDraft(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Background</label>
                    <Input
                      type="color"
                      value={themeDraft.colors.background}
                      onChange={(e) => updateThemeDraft('colors', 'background', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Text</label>
                    <Input
                      type="color"
                      value={themeDraft.colors.text}
                      onChange={(e) => updateThemeDraft('colors', 'text', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Headings / Links</label>
                    <Input
                      type="color"
                      value={themeDraft.colors.h1}
                      onChange={(e) => {
                        updateThemeDraft('colors', 'h1', e.target.value)
                        updateThemeDraft('colors', 'h2', e.target.value)
                        updateThemeDraft('colors', 'h3', e.target.value)
                        updateThemeDraft('colors', 'link', e.target.value)
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Code blocks</label>
                    <Input
                      type="color"
                      value={themeDraft.colors.code_block_background}
                      onChange={(e) => {
                        updateThemeDraft('colors', 'code_block_background', e.target.value)
                        updateThemeDraft('colors', 'code_background', e.target.value)
                      }}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-slate-600">Font family</label>
                    <Input
                      type="text"
                      placeholder="Font family"
                      value={themeDraft.typography.font_family}
                      onChange={(e) => updateThemeDraft('typography', 'font_family', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Base font size (px)</label>
                    <Input
                      type="text"
                      placeholder="Base font size (px)"
                      value={themeDraft.typography.font_size}
                      onChange={(e) => updateThemeDraft('typography', 'font_size', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Slide padding (px)</label>
                    <Input
                      type="text"
                      placeholder="Slide padding (px)"
                      value={themeDraft.spacing.slide_padding}
                      onChange={(e) => updateThemeDraft('spacing', 'slide_padding', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button size="sm" onClick={handleSaveTheme}>
                    {editingThemeId ? 'Save changes' : 'Create theme'}
                  </Button>
                  {themeStatus && <p className="text-xs text-slate-700">{themeStatus}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onInsertText={handleInsertText}
        currentSlideContent={mode === 'blocks' && currentSlideIndex >= 0 ? slides[currentSlideIndex]?.content : content}
      />

      <ThemeCreatorModal
        open={themeCreatorOpen}
        onOpenChange={setThemeCreatorOpen}
        onThemeCreated={() => {
          window.location.reload()
        }}
      />
    </div>
  )
}
