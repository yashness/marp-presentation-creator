import { useEffect, useMemo, useState, useCallback, useRef, useTransition } from 'react'
import Editor from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
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
import { Info, LayoutTemplate, MessageSquarePlus, Sparkles, SlidersHorizontal, X, Download, Palette, Volume2 } from 'lucide-react'
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
  onReloadThemes: () => void
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
  onReloadThemes,
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
  const [isUpdating, startTransition] = useTransition()
  const slideRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [editableSlides, setEditableSlides] = useState<SlideBlock[]>([])
  const [parsedFrontmatter, setParsedFrontmatter] = useState<Record<string, string>>({})
  const lastSerializedRef = useRef<string | null>(null)
  const updateTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (content === lastSerializedRef.current) {
      return
    }
    const parsed = parseSlides(content)
    setParsedFrontmatter(parsed.frontmatter)
    setEditableSlides(parsed.slides.length
      ? parsed.slides
      : [{ id: 'slide-0', content: '# New Slide', comment: '' }])
  }, [content])

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        window.clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  const slides = editableSlides.length
    ? editableSlides
    : [{ id: 'slide-0', content: '# New Slide', comment: '' }]
  const customThemes = useMemo(() => themes.filter(t => !t.is_builtin), [themes])

  const normalizedFrontmatter = useMemo(() => {
    const fm = { ...parsedFrontmatter }
    fm.marp = 'true'
    fm.title = (title && title.trim()) || fm.title || DEFAULT_TITLE
    fm.theme = selectedTheme || fm.theme || DEFAULT_THEME
    fm.paginate = fm.paginate || 'true'
    fm.footer = fm.footer ?? ''
    return fm
  }, [parsedFrontmatter, selectedTheme, title])

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
    lastSerializedRef.current = serialized
    startTransition(() => onContentChange(serialized))
  }, [normalizedFrontmatter, onContentChange, startTransition])

  const scheduleContentUpdate = useCallback((updatedSlides: SlideBlock[]) => {
    if (updateTimeoutRef.current) {
      window.clearTimeout(updateTimeoutRef.current)
    }
    updateTimeoutRef.current = window.setTimeout(() => {
      updateContent(updatedSlides)
    }, 250)
  }, [updateContent])

  const handleSlideChange = useCallback((index: number, value: string) => {
    setEditableSlides(prev => {
      const nextSlides = prev.map((slide, i) =>
        i === index ? { ...slide, content: value } : slide
      )
      scheduleContentUpdate(nextSlides)
      return nextSlides
    })
  }, [scheduleContentUpdate])

  const handleCommentChange = useCallback((index: number, value: string) => {
    setEditableSlides(prev => {
      const nextSlides = prev.map((slide, i) =>
        i === index ? { ...slide, comment: value } : slide
      )
      scheduleContentUpdate(nextSlides)
      return nextSlides
    })
  }, [scheduleContentUpdate])

  const handleTitleInput = (value: string) => {
    onTitleChange(value)
    setParsedFrontmatter(prev => ({ ...prev, title: value.trim() || DEFAULT_TITLE }))
    updateContent(slides, { title: value.trim() || DEFAULT_TITLE })
  }

  const handleThemeChange = (value: string) => {
    const normalized = value || DEFAULT_THEME
    onThemeChange(value || null)
    setParsedFrontmatter(prev => ({ ...prev, theme: normalized }))
    updateContent(slides, { theme: normalized })
  }

  const handlePaginateChange = (checked: boolean) => {
    setParsedFrontmatter(prev => ({ ...prev, paginate: checked ? 'true' : 'false' }))
    updateContent(slides, { paginate: checked ? 'true' : 'false' })
  }

  const handleFooterChange = (value: string) => {
    setParsedFrontmatter(prev => ({ ...prev, footer: value }))
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
    setEditableSlides(nextSlides)
    setCurrentSlideIndex(slides.length)
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
  }, [mode, currentSlideIndex, slides, content, onContentChange, handleSlideChange])

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
    <div className="flex-1 flex flex-col gap-4 p-6 overflow-hidden bg-white border-l border-slate-200 h-[calc(100vh-64px)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary-100 text-primary-700 grid place-items-center border border-primary-200">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Presentation Builder</h1>
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Structured slides or raw Markdown—your choice.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AutosaveStatusIndicator status={autosaveStatus} />
          <div className="flex rounded-md border border-slate-200 overflow-hidden">
            <Button
              variant={mode === 'blocks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('blocks')}
              className="rounded-none"
            >
              Blocks
            </Button>
            <Button
              variant={mode === 'raw' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMode('raw')}
              className="rounded-none border-l border-slate-200"
            >
              Editor
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="hidden md:inline-flex">
            <SlidersHorizontal className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,240px,auto] gap-3 items-center">
          <Input
            type="text"
            placeholder="Presentation title"
            value={title}
            onChange={(e) => handleTitleInput(e.target.value)}
            className="w-full"
          />
          <Select value={selectedTheme || ''} onChange={(e) => handleThemeChange(e.target.value)}>
            <option value="">Default theme</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2 justify-end">
            <Button onClick={() => setCommandPaletteOpen(true)} size="sm" variant="secondary" className="whitespace-nowrap gap-2">
              <Sparkles className="w-4 h-4" />
              AI commands
            </Button>
            <ImageGenerationButton />
            <Button onClick={handleAddSlide} size="sm" className="whitespace-nowrap">
              <MessageSquarePlus className="w-4 h-4" />
              Add slide
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-500" />
            Content updates are queued to stay responsive{isUpdating ? '…' : '.'}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary-500" />
            Theme, pagination, and footer stay in sync with frontmatter.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1 overflow-hidden">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex-1 min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex rounded-md border border-slate-200 overflow-hidden">
                <Button
                  variant={mode === 'blocks' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMode('blocks')}
                  className="rounded-none"
                >
                  Blocks
                </Button>
                <Button
                  variant={mode === 'raw' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setMode('raw')}
                  className="rounded-none border-l border-slate-200"
                >
                  Editor
                </Button>
              </div>
              <CommandPalette
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
                onInsertText={handleInsertText}
                currentSlideContent={slides[currentSlideIndex]?.content}
              />
              <Button variant="outline" size="sm" onClick={() => setCommandPaletteOpen(true)} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Open commands
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <AutosaveStatusIndicator status={autosaveStatus} />
              <ExportButtonGroup
                selectedId={selectedId}
                presentationTitle={title}
                onExport={onExport}
              />
            </div>
          </div>

          {mode === 'raw' ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Raw Markdown</span>
              </div>
              <Editor
                height="68vh"
                defaultLanguage="markdown"
                value={content}
                onChange={(value) => onContentChange(value || '')}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 15,
                  lineNumbers: 'on',
                  smoothScrolling: true,
                  wordWrap: 'on',
                  scrollbar: {
                    useShadows: false,
                    verticalScrollbarSize: 8,
                  },
                }}
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[calc(100%-3.5rem)] overflow-y-auto">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  ref={(node) => { slideRefs.current[slide.id] = node }}
                  className={`p-4 space-y-3 ${currentSlideIndex === index ? 'bg-primary-50/40' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary-700">Slide {index + 1}</span>
                      <span className="text-[11px] text-slate-500">ID: {slide.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={currentSlideIndex === index ? 'default' : 'ghost'}
                        onClick={() => {
                          setCurrentSlideIndex(index)
                          slideRefs.current[slide.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }}
                        className="text-xs"
                      >
                        Focus
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleCommentVisibility(slide.id)}
                        className="text-xs"
                      >
                        {openComments[slide.id] ? 'Hide notes' : 'Add comment'}
                      </Button>
                    </div>
                  </div>
                  {openComments[slide.id] && (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                      <label className="text-xs font-semibold text-slate-700">Slide comment</label>
                      <textarea
                        className="w-full border border-slate-200 rounded-md p-2 text-sm mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        rows={3}
                        value={slide.comment}
                        onChange={(e) => handleCommentChange(index, e.target.value)}
                        placeholder="Add presenter notes or audio prompt"
                      />
                      <div className="pt-2">
                        <TTSButton presentationId={selectedId} slideIndex={index} commentText={slide.comment || ''} />
                      </div>
                    </div>
                  )}
                  <div className="rounded-md border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
                    <Editor
                      height="180px"
                      defaultLanguage="markdown"
                      value={slide.content}
                      onChange={(value) => handleSlideChange(index, value || '')}
                      theme="vs-light"
                      path={`slide-${slide.id}.md`}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'off',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        overviewRulerLanes: 0,
                        glyphMargin: false,
                        folding: false,
                        lineDecorationsWidth: 0,
                        lineNumbersMinChars: 0,
                        renderLineHighlight: 'none',
                        renderWhitespace: 'none',
                        contextmenu: false,
                        quickSuggestions: false,
                        suggestOnTriggerCharacters: false,
                        parameterHints: { enabled: false },
                        lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.Off },
                        codeLens: false,
                        formatOnType: false,
                        formatOnPaste: false,
                        scrollbar: {
                          verticalScrollbarSize: 6,
                          horizontalScrollbarSize: 6,
                        },
                        padding: { top: 8, bottom: 8 },
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="p-4">
                <Button onClick={handleAddSlide} size="sm" variant="outline" className="w-full">
                  Add another slide
                </Button>
              </div>
            </div>
          )}
        </div>
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
                  <p className="text-xs text-slate-500">Meta, exports, TTS, and themes.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Presentation meta</p>
                    <p className="text-xs text-slate-500">Title, theme, pagination, footer.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(false)}>
                    <X className="w-4 h-4" />
                    Hide
                  </Button>
                </div>
                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Presentation title"
                    value={title}
                    onChange={(e) => handleTitleInput(e.target.value)}
                  />
                  <Select value={selectedTheme || ''} onChange={(e) => handleThemeChange(e.target.value)}>
                    <option value="">Default theme</option>
                    {themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </Select>
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      id="paginate-drawer"
                      type="checkbox"
                      defaultChecked={normalizedFrontmatter.paginate === 'true'}
                      onChange={(e) => handlePaginateChange(e.target.checked)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="paginate-drawer" className="text-slate-700">Paginate slides</label>
                  </div>
                  <textarea
                    placeholder="Footer text (supports spaces and new lines)"
                    className="w-full border border-slate-200 rounded-md p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    rows={3}
                    defaultValue={normalizedFrontmatter.footer}
                    onChange={(e) => handleFooterChange(e.target.value)}
                  />
                </div>
              </div>

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

              <div className="rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Text-to-speech</p>
                      <p className="text-xs text-slate-500">Generate and play slide narration.</p>
                    </div>
                  </div>
                </div>
                <TTSButton
                  presentationId={selectedId}
                  slideIndex={currentSlideIndex}
                  commentText={slides[currentSlideIndex]?.comment || ''}
                />
                <p className="text-xs text-slate-500">Uses Kokoro TTS. Voice defaults to Bella for reliability.</p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-secondary-600" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Theme controls</p>
                      <p className="text-sm text-slate-700">Apply or create custom themes.</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setThemeCreatorOpen(true)} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Theme creator
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customThemes.map(theme => (
                    <Button
                      key={theme.id}
                      variant={selectedTheme === theme.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        handleThemeChange(theme.id)
                        setThemeStatus(`Applied theme: ${theme.name}`)
                      }}
                    >
                      {theme.name}
                    </Button>
                  ))}
                </div>
                {themeStatus && <p className="text-xs text-slate-500">{themeStatus}</p>}
              </div>

              <div className="rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
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
                  variant="secondary"
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteTheme}
                      disabled={!editingThemeId}
                    >
                      Delete theme
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Input
                    placeholder="Theme name"
                    value={themeDraft.name}
                    onChange={(e) => setThemeDraft(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Description"
                    value={themeDraft.description || ''}
                    onChange={(e) => setThemeDraft(prev => ({ ...prev, description: e.target.value }))}
                  />
                  {Object.entries(themeDraft.colors).map(([key, value]) => (
                    <Input
                      key={key}
                      placeholder={key}
                      value={value || ''}
                      onChange={(e) => updateThemeDraft('colors', key, e.target.value)}
                    />
                  ))}
                  {Object.entries(themeDraft.typography).map(([key, value]) => (
                    <Input
                      key={key}
                      placeholder={key}
                      value={value || ''}
                      onChange={(e) => updateThemeDraft('typography', key, e.target.value)}
                    />
                  ))}
                  {Object.entries(themeDraft.spacing).map(([key, value]) => (
                    <Input
                      key={key}
                      placeholder={key}
                      value={value || ''}
                      onChange={(e) => updateThemeDraft('spacing', key, e.target.value)}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveTheme}>Save theme</Button>
                  <Button size="sm" variant="outline" onClick={resetThemeDraft}>Reset fields</Button>
                </div>
                {themeStatus && <p className="text-xs text-slate-600">{themeStatus}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <ThemeCreatorModal
        open={themeCreatorOpen}
        onOpenChange={setThemeCreatorOpen}
        onThemeCreated={() => {
          setThemeStatus('Theme created from AI. Select it from the list once loaded.')
          onReloadThemes()
        }}
      />
    </div>
  )
}
