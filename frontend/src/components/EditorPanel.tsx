import { useEffect, useMemo, useState, useCallback, useRef, useTransition } from 'react'
import Editor from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type { Theme, ThemeCreatePayload, SlideOperation } from '../api/client'
import { rewriteSlide, rewriteSelectedText, regenerateComment, regenerateAllComments, generateCommentary, performSlideOperation } from '../api/client'
import type { editor } from 'monaco-editor'
import { useToast } from '../contexts/ToastContext'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { ExportButton } from './ExportButton'
import { VideoExportButton } from './VideoExportButton'
import { AutosaveStatusIndicator } from './AutosaveStatusIndicator'
import { TTSButton } from './TTSButton'
import { SlideImageButton } from './SlideImageButton'
import { CommandPalette } from './CommandPalette'
import { ThemeCreatorModal } from './ThemeCreatorModal'
import { ThemeStudio } from './ThemeStudio'
import { LayoutPicker } from './LayoutPicker'
import { TransformMenu } from './TransformMenu'
import { AIActionsMenu } from './AIActionsMenu'
import { SlideActionsMenu } from './SlideActionsMenu'
import { Info, LayoutTemplate, MessageSquarePlus, SlidersHorizontal, X, Download, Palette, Volume2, Trash2, Plus, Wand2, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from './ui/button'
import { parseSlides, serializeSlides } from '../lib/markdown'
import type { SlideBlock } from '../lib/markdown'
import { DEFAULT_THEME, DEFAULT_TITLE } from '../lib/constants'
import { AnimatePresence, motion } from 'motion/react'

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
  const [themeStatus, setThemeStatus] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0)
  const [themeCreatorOpen, setThemeCreatorOpen] = useState(false)
  const [isUpdating, startTransition] = useTransition()
  const slideRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [editableSlides, setEditableSlides] = useState<SlideBlock[]>([])
  const [parsedFrontmatter, setParsedFrontmatter] = useState<Record<string, string>>({})
  const lastSerializedRef = useRef<string | null>(null)
  const updateTimeoutRef = useRef<number | null>(null)

  // AI Rewrite state
  const [rewriteSlideIndex, setRewriteSlideIndex] = useState<number | null>(null)
  const [rewriteInstruction, setRewriteInstruction] = useState('')
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [rewriteCommentIndex, setRewriteCommentIndex] = useState<number | null>(null)
  const [rewriteCommentInstruction, setRewriteCommentInstruction] = useState('')
  const [rewriteCommentLoading, setRewriteCommentLoading] = useState(false)
  const [regenerateAllLoading, setRegenerateAllLoading] = useState(false)
  const [rewriteLength, setRewriteLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [slideOperationLoading, setSlideOperationLoading] = useState<Record<number, string>>({})
  const [generateCommentaryLoading, setGenerateCommentaryLoading] = useState(false)
  const [layoutPickerIndex, setLayoutPickerIndex] = useState<number | null>(null)
  const [transformMenuOpen, setTransformMenuOpen] = useState(false)
  const { showToast } = useToast()

  // Selection-based rewrite state
  const [selectedText, setSelectedText] = useState<{ index: number; text: string; start: number; end: number } | null>(null)
  const [selectionRewriteOpen, setSelectionRewriteOpen] = useState(false)
  const [selectionRewriteInstruction, setSelectionRewriteInstruction] = useState('')
  const [selectionRewriteLoading, setSelectionRewriteLoading] = useState(false)
  const editorRefs = useRef<Record<string, editor.IStandaloneCodeEditor | null>>({})

  // Memoize parsed slides to avoid re-parsing on every render
  const parsedContent = useMemo(() => {
    if (content === lastSerializedRef.current) {
      return null
    }
    return parseSlides(content)
  }, [content])

  useEffect(() => {
    if (!parsedContent) {
      return
    }
    setParsedFrontmatter(parsedContent.frontmatter)
    setEditableSlides(parsedContent.slides.length
      ? parsedContent.slides
      : [{ id: 'slide-0', content: '# New Slide', comment: '' }])
  }, [parsedContent])

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

  const handleInsertSlide = useCallback((afterIndex: number) => {
    const newSlide = {
      id: `slide-${Date.now()}`,
      content: `# New Slide\n\n- Add your content here`,
      comment: '',
    }
    const nextSlides = [
      ...slides.slice(0, afterIndex + 1),
      newSlide,
      ...slides.slice(afterIndex + 1),
    ]
    updateContent(nextSlides)
    setEditableSlides(nextSlides)
    setCurrentSlideIndex(afterIndex + 1)
  }, [slides, updateContent])

  const handleDeleteSlide = useCallback((index: number) => {
    if (slides.length === 1) return
    const nextSlides = slides.filter((_, i) => i !== index)
    updateContent(nextSlides)
    setEditableSlides(nextSlides)
    if (currentSlideIndex >= nextSlides.length) {
      setCurrentSlideIndex(Math.max(0, nextSlides.length - 1))
    }
  }, [slides, updateContent, currentSlideIndex])

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

  const handleAIRewriteSlide = useCallback(async (index: number) => {
    if (!rewriteInstruction.trim()) return
    setRewriteLoading(true)
    try {
      const slide = slides[index]
      const lengthHint = rewriteLength === 'short' ? ' Keep content brief and concise.' :
                         rewriteLength === 'long' ? ' Expand with more detail and examples.' : ''
      const newContent = await rewriteSlide(slide.content, rewriteInstruction + lengthHint)
      handleSlideChange(index, newContent)
      setRewriteSlideIndex(null)
      setRewriteInstruction('')
      showToast('Slide rewritten successfully', 'success')
    } catch (error) {
      console.error('Failed to rewrite slide:', error)
      showToast('Failed to rewrite slide', 'error')
    } finally {
      setRewriteLoading(false)
    }
  }, [slides, rewriteInstruction, rewriteLength, handleSlideChange, showToast])

  const handleAIRewriteComment = useCallback(async (index: number) => {
    setRewriteCommentLoading(true)
    try {
      const slide = slides[index]
      const contextBefore = index > 0 ? slides[index - 1].content : undefined
      const contextAfter = index < slides.length - 1 ? slides[index + 1].content : undefined
      const style = rewriteCommentInstruction.trim() || 'professional'
      const newComment = await regenerateComment(
        slide.content,
        slide.comment,
        contextBefore,
        contextAfter,
        style
      )
      handleCommentChange(index, newComment)
      setRewriteCommentIndex(null)
      setRewriteCommentInstruction('')
      showToast('Comment generated', 'success')
    } catch (error) {
      console.error('Failed to regenerate comment:', error)
      showToast('Failed to generate comment', 'error')
    } finally {
      setRewriteCommentLoading(false)
    }
  }, [slides, rewriteCommentInstruction, handleCommentChange, showToast])

  const handleRegenerateAllComments = useCallback(async () => {
    if (!confirm('Regenerate all comments? This will replace existing narrations.')) return
    setRegenerateAllLoading(true)
    try {
      const slideData = slides.map(s => ({ content: s.content, comment: s.comment }))
      const newComments = await regenerateAllComments(slideData, 'professional')
      const updatedSlides = slides.map((slide, i) => ({
        ...slide,
        comment: newComments[i] || slide.comment
      }))
      setEditableSlides(updatedSlides)
      updateContent(updatedSlides, normalizedFrontmatter)
      showToast('All comments regenerated', 'success')
    } catch (error) {
      console.error('Failed to regenerate all comments:', error)
      showToast('Failed to regenerate comments', 'error')
    } finally {
      setRegenerateAllLoading(false)
    }
  }, [slides, normalizedFrontmatter, updateContent, showToast])

  const handleQuickRewrite = useCallback(async (index: number, instruction: string) => {
    setRewriteLoading(true)
    try {
      const slide = slides[index]
      const lengthHint = rewriteLength === 'short' ? ' Keep content brief.' :
                         rewriteLength === 'long' ? ' Add more detail.' : ''
      const newContent = await rewriteSlide(slide.content, instruction + lengthHint)
      handleSlideChange(index, newContent)
      showToast('Slide updated', 'success')
    } catch (error) {
      console.error('Failed to rewrite slide:', error)
      showToast('Failed to rewrite slide', 'error')
    } finally {
      setRewriteLoading(false)
    }
  }, [slides, rewriteLength, handleSlideChange, showToast])

  const handleRewriteSelectedText = useCallback(async () => {
    if (!selectedText || !selectionRewriteInstruction.trim()) return
    setSelectionRewriteLoading(true)
    try {
      const slide = slides[selectedText.index]
      const { content } = await rewriteSelectedText(
        slide.content,
        selectedText.text,
        selectionRewriteInstruction,
        selectedText.start,
        selectedText.end
      )
      handleSlideChange(selectedText.index, content)
      setSelectionRewriteOpen(false)
      setSelectionRewriteInstruction('')
      setSelectedText(null)
      showToast('Selected text rewritten', 'success')
    } catch (error) {
      console.error('Failed to rewrite selected text:', error)
      showToast('Failed to rewrite selected text', 'error')
    } finally {
      setSelectionRewriteLoading(false)
    }
  }, [selectedText, selectionRewriteInstruction, slides, handleSlideChange, showToast])

  const handleEditorDidMount = useCallback((editorInstance: editor.IStandaloneCodeEditor, slideId: string, index: number) => {
    editorRefs.current[slideId] = editorInstance
    editorInstance.onDidChangeCursorSelection(() => {
      const selection = editorInstance.getSelection()
      if (selection && !selection.isEmpty()) {
        const model = editorInstance.getModel()
        if (model) {
          const text = model.getValueInRange(selection)
          const startOffset = model.getOffsetAt(selection.getStartPosition())
          const endOffset = model.getOffsetAt(selection.getEndPosition())
          if (text.trim()) {
            setSelectedText({ index, text, start: startOffset, end: endOffset })
          }
        }
      } else {
        // Delay clearing to allow clicking on buttons
        setTimeout(() => {
          const currentSelection = editorInstance.getSelection()
          if (!currentSelection || currentSelection.isEmpty()) {
            setSelectedText((prev) => prev?.index === index ? null : prev)
          }
        }, 200)
      }
    })
  }, [])

  const handleSlideOperation = useCallback(async (index: number, operation: SlideOperation, style?: string) => {
    setSlideOperationLoading(prev => ({ ...prev, [index]: operation }))
    try {
      const slide = slides[index]
      const result = await performSlideOperation(slide.content, operation, style)

      if (operation === 'split' && result.slides) {
        const newSlides = result.slides.map((content, i) => ({
          id: `slide-${Date.now()}-${i}`,
          content,
          comment: ''
        }))
        const nextSlides = [
          ...slides.slice(0, index),
          ...newSlides,
          ...slides.slice(index + 1)
        ]
        setEditableSlides(nextSlides)
        updateContent(nextSlides)
        showToast(`Slide split into ${newSlides.length} slides`, 'success')
      } else if (result.content) {
        handleSlideChange(index, result.content)
        const opNames: Record<SlideOperation, string> = {
          layout: 'Layout applied',
          restyle: 'Style updated',
          simplify: 'Slide simplified',
          expand: 'Slide expanded',
          split: 'Slide split',
        }
        showToast(opNames[operation], 'success')
      }
    } catch (error) {
      console.error(`Slide operation ${operation} failed:`, error)
      showToast(`Failed to ${operation} slide`, 'error')
    } finally {
      setSlideOperationLoading(prev => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    }
  }, [slides, handleSlideChange, updateContent, showToast])

  const handleGenerateCommentary = useCallback(async () => {
    if (!confirm('Generate audio-ready commentary for all slides? This will replace existing comments.')) return
    setGenerateCommentaryLoading(true)
    try {
      const slideData = slides.map(s => ({ content: s.content }))
      const comments = await generateCommentary(slideData, 'professional')
      const updatedSlides = slides.map((slide, i) => ({
        ...slide,
        comment: comments[i] || slide.comment
      }))
      setEditableSlides(updatedSlides)
      updateContent(updatedSlides, normalizedFrontmatter)
      setOpenComments(prev => {
        const next = { ...prev }
        updatedSlides.forEach(s => { next[s.id] = true })
        return next
      })
      showToast('Commentary generated for all slides', 'success')
    } catch (error) {
      console.error('Failed to generate commentary:', error)
      showToast('Failed to generate commentary', 'error')
    } finally {
      setGenerateCommentaryLoading(false)
    }
  }, [slides, normalizedFrontmatter, updateContent, showToast])

  const handleDuplicateSlide = useCallback((index: number) => {
    const slide = slides[index]
    const newSlide = {
      id: `slide-${Date.now()}`,
      content: slide.content,
      comment: slide.comment,
    }
    const nextSlides = [
      ...slides.slice(0, index + 1),
      newSlide,
      ...slides.slice(index + 1),
    ]
    setEditableSlides(nextSlides)
    updateContent(nextSlides)
    setCurrentSlideIndex(index + 1)
  }, [slides, updateContent])

  const handleApplyLayout = useCallback((index: number, newContent: string) => {
    handleSlideChange(index, newContent)
    setLayoutPickerIndex(null)
  }, [handleSlideChange])

  const handleTransformedSlides = useCallback((transformedSlides: string[]) => {
    const updatedSlides = slides.map((slide, i) => ({
      ...slide,
      content: transformedSlides[i] || slide.content,
    }))
    setEditableSlides(updatedSlides)
    updateContent(updatedSlides)
  }, [slides, updateContent])


  return (
    <div className="flex-1 flex flex-col gap-4 p-6 overflow-hidden bg-white rounded-xl border border-slate-200 shadow-lg h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary-100 text-primary-700 grid place-items-center border border-primary-200 shadow-sm">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Editor</h1>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Craft your slides with precision
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
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <AIActionsMenu
              onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
              onTransformOpen={() => setTransformMenuOpen(true)}
              onGenerateCommentary={handleGenerateCommentary}
              onRegenerateComments={handleRegenerateAllComments}
              isCommentaryLoading={generateCommentaryLoading}
              isRegeneratingLoading={regenerateAllLoading}
              disabled={slides.length === 0}
            />
            <TransformMenu
              isOpen={transformMenuOpen}
              onClose={() => setTransformMenuOpen(false)}
              slides={slides.map(s => s.content)}
              onTransformed={handleTransformedSlides}
            />
            <Button onClick={handleAddSlide} size="sm" className="whitespace-nowrap gap-2">
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
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-secondary-200">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-md border border-secondary-200 overflow-hidden">
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
                  className="rounded-none border-l border-secondary-200"
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
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
                <div key={slide.id}>
                  {/* Insert button before first slide */}
                  {index === 0 && (
                    <div className="flex items-center justify-center py-1 group">
                      <button
                        onClick={() => handleInsertSlide(-1)}
                        className="flex items-center gap-1 px-3 py-1 text-xs text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Insert slide above</span>
                      </button>
                    </div>
                  )}
                  <div
                    ref={(node) => { slideRefs.current[slide.id] = node }}
                    className={`p-4 space-y-3 ${currentSlideIndex === index ? 'bg-primary-50/40' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary-700">Slide {index + 1}</span>
                        <span className="text-[11px] text-slate-500">ID: {slide.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRewriteSlideIndex(rewriteSlideIndex === index ? null : index)}
                            className="text-xs gap-1 text-primary-700 border-primary-200 hover:bg-primary-50 hover:border-primary-300"
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            AI Rewrite
                          </Button>
                          <AnimatePresence>
                            {rewriteSlideIndex === index && (
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4"
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="h-8 w-8 rounded-lg bg-primary-100 text-primary-700 grid place-items-center">
                                    <Wand2 className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">AI Rewrite Slide</p>
                                    <p className="text-xs text-slate-500">Describe how to change this slide</p>
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  placeholder="e.g., make it more concise, add examples..."
                                  value={rewriteInstruction}
                                  onChange={(e) => setRewriteInstruction(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAIRewriteSlide(index)}
                                  className="w-full border border-secondary-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  autoFocus
                                />
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {['Make concise', 'Add examples', 'Simplify', 'More detail'].map((preset) => (
                                    <button
                                      key={preset}
                                      onClick={() => { setRewriteInstruction(preset); handleQuickRewrite(index, preset) }}
                                      className="px-2 py-1 text-xs bg-secondary-100 hover:bg-primary-100 text-secondary-600 hover:text-primary-700 rounded-md transition-colors"
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2 mb-3">
                                  <span className="text-xs text-secondary-500 self-center">Length:</span>
                                  {(['short', 'medium', 'long'] as const).map((len) => (
                                    <button
                                      key={len}
                                      onClick={() => setRewriteLength(len)}
                                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                                        rewriteLength === len
                                          ? 'bg-primary-600 text-white'
                                          : 'bg-secondary-100 text-secondary-600 hover:bg-primary-100'
                                      }`}
                                    >
                                      {len.charAt(0).toUpperCase() + len.slice(1)}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setRewriteSlideIndex(null); setRewriteInstruction('') }}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAIRewriteSlide(index)}
                                    disabled={rewriteLoading || !rewriteInstruction.trim()}
                                    className="flex-1 bg-primary-700 hover:bg-primary-800"
                                  >
                                    {rewriteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rewrite'}
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <SlideImageButton
                          slideContent={slide.content}
                          onImageInsert={(markdown) => handleSlideChange(index, slide.content + '\n\n' + markdown)}
                        />
                        {/* Slide actions menu */}
                        <div className="relative">
                          <SlideActionsMenu
                            onLayoutClick={() => setLayoutPickerIndex(layoutPickerIndex === index ? null : index)}
                            onOperation={(op) => handleSlideOperation(index, op)}
                            onDuplicate={() => handleDuplicateSlide(index)}
                            loadingOperation={slideOperationLoading[index] || null}
                          />
                          {layoutPickerIndex === index && (
                            <LayoutPicker
                              isOpen={true}
                              onClose={() => setLayoutPickerIndex(null)}
                              slideContent={slide.content}
                              onApplyLayout={(newContent) => handleApplyLayout(index, newContent)}
                            />
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCommentVisibility(slide.id)}
                          className="text-xs"
                        >
                          {openComments[slide.id] ? 'Hide comments' : 'Add comment'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSlide(index)}
                          disabled={slides.length === 1}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  {openComments[slide.id] && (
                    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary-100 text-primary-600 grid place-items-center">
                            <MessageSquarePlus className="w-4 h-4" />
                          </div>
                          <label className="text-sm font-semibold text-primary-800">Slide comment</label>
                        </div>
                        <div className="relative">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRewriteCommentIndex(rewriteCommentIndex === index ? null : index)}
                            className="text-xs gap-1 text-primary-600 border-primary-200 hover:bg-primary-50 hover:border-primary-300"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            AI Generate
                          </Button>
                          <AnimatePresence>
                            {rewriteCommentIndex === index && (
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4"
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="h-8 w-8 rounded-lg bg-primary-100 text-primary-600 grid place-items-center">
                                    <RefreshCw className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">Generate Comment</p>
                                    <p className="text-xs text-slate-500">AI will create narration based on slide content</p>
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Style: e.g., conversational, formal, enthusiastic..."
                                  value={rewriteCommentInstruction}
                                  onChange={(e) => setRewriteCommentInstruction(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAIRewriteComment(index)}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  autoFocus
                                />
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {['Conversational', 'Professional', 'Enthusiastic', 'Concise'].map((preset) => (
                                    <button
                                      key={preset}
                                      onClick={() => { setRewriteCommentInstruction(preset); handleAIRewriteComment(index) }}
                                      className="px-2 py-1 text-xs bg-slate-100 hover:bg-primary-100 text-secondary-600 hover:text-primary-700 rounded-md transition-colors"
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setRewriteCommentIndex(null); setRewriteCommentInstruction('') }}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAIRewriteComment(index)}
                                    disabled={rewriteCommentLoading}
                                    className="flex-1 bg-primary-600 hover:bg-primary-700"
                                  >
                                    {rewriteCommentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <textarea
                        className="w-full border-2 border-primary-200 rounded-lg p-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:border-primary-400"
                        rows={3}
                        value={slide.comment}
                        onChange={(e) => handleCommentChange(index, e.target.value)}
                        placeholder="Add presenter notes or audio prompt"
                      />
                      <div className="pt-3">
                        <TTSButton presentationId={selectedId} slideIndex={index} commentText={slide.comment || ''} />
                      </div>
                    </div>
                  )}
                  <div className="relative rounded-md border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 px-4">
                    {/* Selection Rewrite Button */}
                    <AnimatePresence>
                      {selectedText && selectedText.index === index && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-2 right-4 z-20"
                        >
                          <Button
                            size="sm"
                            onClick={() => setSelectionRewriteOpen(true)}
                            className="gap-1.5 bg-secondary-600 hover:bg-secondary-700 text-white shadow-lg"
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            Rewrite Selection
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Selection Rewrite Modal */}
                    <AnimatePresence>
                      {selectionRewriteOpen && selectedText && selectedText.index === index && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute top-12 right-4 z-30 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-lg bg-secondary-100 text-secondary-700 grid place-items-center">
                              <Wand2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">Rewrite Selection</p>
                              <p className="text-xs text-slate-500">Modify only the selected text</p>
                            </div>
                          </div>
                          <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Selected text:</p>
                            <p className="text-sm text-slate-700 line-clamp-2 font-mono">
                              "{selectedText.text.length > 100 ? selectedText.text.slice(0, 100) + '...' : selectedText.text}"
                            </p>
                          </div>
                          <input
                            type="text"
                            placeholder="e.g., make it shorter, add emphasis..."
                            value={selectionRewriteInstruction}
                            onChange={(e) => setSelectionRewriteInstruction(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRewriteSelectedText()}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                            autoFocus
                          />
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {['Simplify', 'Expand', 'Make formal', 'Make casual'].map((preset) => (
                              <button
                                key={preset}
                                onClick={() => {
                                  setSelectionRewriteInstruction(preset)
                                }}
                                className="px-2 py-1 text-xs bg-slate-100 hover:bg-secondary-100 text-slate-600 hover:text-secondary-700 rounded-md transition-colors"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectionRewriteOpen(false)
                                setSelectionRewriteInstruction('')
                              }}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleRewriteSelectedText}
                              disabled={selectionRewriteLoading || !selectionRewriteInstruction.trim()}
                              className="flex-1 bg-secondary-600 hover:bg-secondary-700"
                            >
                              {selectionRewriteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rewrite'}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Editor
                      height="180px"
                      defaultLanguage="markdown"
                      value={slide.content}
                      onChange={(value) => handleSlideChange(index, value || '')}
                      onMount={(editorInstance) => handleEditorDidMount(editorInstance, slide.id, index)}
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
                        padding: { top: 16, bottom: 16 },
                      }}
                    />
                  </div>
                  </div>

                  {/* Insert button between slides */}
                  <div className="flex items-center justify-center py-2 group relative">
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={() => handleInsertSlide(index)}
                      className="relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-slate-400 bg-white border border-transparent hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Insert slide</span>
                    </button>
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

              <div className="rounded-lg border border-slate-200 p-4 shadow-sm">
                <ThemeStudio
                  themes={themes}
                  selectedTheme={selectedTheme}
                  onThemeChange={onThemeChange}
                  onCreateTheme={onCreateTheme}
                  onUpdateTheme={onUpdateTheme}
                  onDeleteTheme={onDeleteTheme}
                  onOpenAICreator={() => setThemeCreatorOpen(true)}
                />
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
