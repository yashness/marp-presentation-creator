import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Presentation, Folder } from './api/client'
import { getPreview, fetchFolders, createFolder, updateFolder, deleteFolder } from './api/client'
import { parseSlides, serializeSlides } from './lib/markdown'
import { EditorPanel } from './components/EditorPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { AIGenerationModal } from './components/AIGenerationModal'
import { AssetManagerModal } from './components/AssetManagerModal'
import { AIChatPanel } from './components/AIChatPanel'
import { VersionHistoryPanel } from './components/VersionHistoryPanel'
import { TemplateLibrary } from './components/TemplateLibrary'
import { ShareModal } from './components/ShareModal'
import { SharedViewer } from './components/SharedViewer'
import { FontManager } from './components/FontManager'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { AppSidebar } from './components/AppSidebar'
import { AppHeader } from './components/AppHeader'
import type { Template } from './api/client'
import { createVersion } from './api/client'
import type { RestoreVersionResponse } from './api/client'
import { usePresentations } from './hooks/usePresentations'
import { usePresentationEditor } from './hooks/usePresentationEditor'
import { useApiHandler } from './hooks/useApiHandler'
import { useThemes } from './hooks/useThemes'
import { getMostRecentPresentation, extractIdFromSlug, updateBrowserUrl, getSlugFromUrl } from './lib/utils'
import { cn } from './lib/utils'
import { AUTOSAVE_DEBOUNCE_MS } from './lib/constants'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [hasUserInput, setHasUserInput] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [autosaveEnabled, setAutosaveEnabled] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showFontManager, setShowFontManager] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  // Check if we're on a share page
  const shareToken = useMemo(() => {
    const path = window.location.pathname
    const match = path.match(/^\/share\/([^/]+)$/)
    return match ? match[1] : null
  }, [])

  // If on share page, render the shared viewer
  if (shareToken) {
    return <SharedViewer token={shareToken} />
  }

  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor')
  const { handleApiCall } = useApiHandler()
  const { themes, createTheme, updateTheme, deleteTheme, reloadThemes } = useThemes()
  const slugPendingRef = useRef<string | null>(null)
  const autoSelectRef = useRef(true)

  const editor = usePresentationEditor()
  const { presentations, create, update, remove, duplicate } = usePresentations(searchQuery, editor.selectedTheme)

  const markDirty = useCallback(() => setHasUserInput(true), [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this presentation?')) return
    const result = await handleApiCall(
      () => remove(id),
      'Presentation deleted successfully',
      'Failed to delete presentation',
    )
    if (result && editor.selectedId === id) {
      editor.clearSelection()
    }
    setMenuOpenId(null)
  }, [handleApiCall, remove, editor.selectedId, editor.clearSelection])

  const handleSelect = useCallback(async (pres: Presentation) => {
    await handleApiCall(
      () => editor.selectPresentation(pres),
      '',
      'Failed to load presentation',
    )
    setHasUserInput(false)
    setAutosaveStatus('idle')
    setAutosaveEnabled(true)
    updateBrowserUrl(pres.title, pres.id)
  }, [handleApiCall, editor.selectPresentation])

  const canAutosave = useMemo(() => editor.content.trim().length > 0, [editor.content])

  const trySelectFromSlug = useCallback((presentations: Presentation[]): Presentation | null => {
    if (!slugPendingRef.current) {
      slugPendingRef.current = getSlugFromUrl()
    }
    if (!slugPendingRef.current) return null

    const maybeId = extractIdFromSlug(slugPendingRef.current)
    const candidate = presentations.find(p => p.id === maybeId)
    if (candidate) {
      slugPendingRef.current = null
    }
    return candidate || null
  }, [])

  const autoSelectPresentation = useCallback(() => {
    const fromSlug = trySelectFromSlug(presentations)
    if (fromSlug) {
      handleSelect(fromSlug)
      return
    }
    const recent = getMostRecentPresentation(presentations)
    if (recent) {
      handleSelect(recent)
    }
    autoSelectRef.current = false
  }, [presentations, trySelectFromSlug, handleSelect])

  const refreshPreviewAndMarkSaved = useCallback(async (id: string) => {
    const html = await getPreview(id)
    editor.setPreview(html)
    setHasUserInput(false)
    setAutosaveStatus('saved')
  }, [editor.setPreview])

  const createNewPresentation = useCallback(async (title: string, content: string, themeId: string | null) => {
    const created = await handleApiCall(
      () => create(title, content, themeId),
      '',
      'Failed to auto-save draft',
    )
    if (created) {
      editor.setCreatedMeta(created)
      await refreshPreviewAndMarkSaved(created.id)
    } else {
      setAutosaveStatus('error')
    }
  }, [handleApiCall, create, editor.setCreatedMeta, refreshPreviewAndMarkSaved])

  const updateExistingPresentation = useCallback(async (id: string, title: string, content: string, themeId: string | null) => {
    const updated = await handleApiCall(
      () => update(id, title, content, themeId),
      '',
      'Failed to auto-save changes',
    )
    if (updated) {
      await refreshPreviewAndMarkSaved(updated.id)
    } else {
      setAutosaveStatus('error')
    }
  }, [handleApiCall, update, refreshPreviewAndMarkSaved])

  const performAutosave = useCallback(async () => {
    const title = editor.title.trim() || 'Untitled presentation'
    const themeId = editor.selectedTheme || null
    setAutosaveStatus('saving')

    if (!editor.selectedId) {
      await createNewPresentation(title, editor.content, themeId)
    } else {
      await updateExistingPresentation(editor.selectedId, title, editor.content, themeId)
    }
  }, [editor.title, editor.content, editor.selectedTheme, editor.selectedId, createNewPresentation, updateExistingPresentation])

  const handleAIGenerate = useCallback((content: string, title: string) => {
    editor.clearSelection()
    editor.setTitle(title)
    editor.setContent(content)
    setHasUserInput(true)
    setAutosaveEnabled(true)
    autoSelectRef.current = false
  }, [editor])

  const getCurrentSlideInfo = useCallback(() => {
    const parsed = parseSlides(editor.content)
    return { slides: parsed.slides, count: parsed.slides.length }
  }, [editor.content])

  const handleApplyToCurrentSlide = useCallback((content: string) => {
    editor.setContent(content)
    markDirty()
  }, [editor, markDirty])

  const handleCreateNewPresentationFromChat = useCallback((content: string, title: string) => {
    editor.clearSelection()
    editor.setTitle(title)
    editor.setContent(content)
    setHasUserInput(true)
    setAutosaveEnabled(true)
    autoSelectRef.current = false
  }, [editor])

  const handleInsertSlide = useCallback((content: string, afterIndex: number) => {
    const parsed = parseSlides(editor.content)
    const newSlide = { id: `slide-${Date.now()}`, content, comment: '' }
    const updatedSlides = [...parsed.slides]
    updatedSlides.splice(afterIndex + 1, 0, newSlide)
    editor.setContent(serializeSlides(parsed.frontmatter, updatedSlides))
    markDirty()
  }, [editor, markDirty])

  const handleVersionRestore = useCallback((data: RestoreVersionResponse) => {
    editor.setTitle(data.title)
    editor.setContent(data.content)
    if (data.theme_id) {
      editor.setSelectedTheme(data.theme_id)
    }
    setHasUserInput(true)
  }, [editor])

  const _saveCheckpoint = useCallback(async (name?: string) => {
    if (!editor.selectedId) return
    await handleApiCall(
      () => createVersion(editor.selectedId!, name),
      'Checkpoint saved',
      'Failed to save checkpoint'
    )
  }, [editor.selectedId, handleApiCall])
  void _saveCheckpoint

  const handleCreateThemeFromChat = useCallback(async (colors: string[], name: string, description: string) => {
    const themeData = {
      name,
      description: description || `Theme created with colors: ${colors.join(', ')}`,
      colors: {
        background: '#0b1024',
        text: '#e2e8f0',
        h1: colors[0] || '#0ea5e9',
        h2: colors[1] || '#7c3aed',
        h3: colors[2] || colors[0] || '#0ea5e9',
        link: colors[3] || colors[0] || '#38bdf8',
        code_background: '#0f172a',
        code_text: '#e2e8f0',
        code_block_background: '#111827',
        code_block_text: '#e5e7eb',
      },
      typography: {
        font_family: 'Sora, "Helvetica Neue", sans-serif',
        font_size: '28px',
        h1_size: '52px',
        h1_weight: '700',
        h2_size: '38px',
        h2_weight: '700',
        h3_size: '30px',
        h3_weight: '600',
        code_font_family: '"JetBrains Mono", monospace',
      },
      spacing: {
        slide_padding: '64px',
        h1_margin_bottom: '24px',
        h2_margin_top: '18px',
        code_padding: '2px 10px',
        code_block_padding: '18px',
        border_radius: '10px',
        code_block_border_radius: '12px',
      }
    }
    await handleApiCall(
      () => createTheme(themeData),
      `Theme "${name}" created`,
      'Failed to create theme'
    )
    reloadThemes()
  }, [handleApiCall, createTheme, reloadThemes])

  const handleNewPresentation = useCallback(() => {
    editor.clearSelection()
    setHasUserInput(false)
    setAutosaveEnabled(true)
    autoSelectRef.current = false
    window.history.replaceState({}, '', '/slides/new')
  }, [editor])

  const handleTemplateSelect = useCallback((template: Template) => {
    editor.clearSelection()
    editor.setTitle(template.name)
    editor.setContent(template.content)
    if (template.theme_id) {
      editor.setSelectedTheme(template.theme_id)
    }
    setHasUserInput(true)
    setAutosaveEnabled(true)
    autoSelectRef.current = false
    window.history.replaceState({}, '', '/slides/new')
  }, [editor])

  const handleDuplicate = useCallback(async (id: string) => {
    const result = await handleApiCall(
      () => duplicate(id),
      'Presentation duplicated',
      'Failed to duplicate presentation',
    )
    if (result) {
      editor.selectPresentation(result)
    }
    setMenuOpenId(null)
  }, [handleApiCall, duplicate, editor])

  useEffect(() => {
    if (!autosaveEnabled || !hasUserInput || !canAutosave) return
    const timeout = setTimeout(performAutosave, AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [autosaveEnabled, hasUserInput, canAutosave, performAutosave])

  useEffect(() => {
    if (!hasUserInput && autosaveStatus !== 'saving') {
      setAutosaveStatus('idle')
    }
  }, [hasUserInput, autosaveStatus])

  useEffect(() => {
    fetchFolders(undefined, true).then(setFolders).catch(console.error)
  }, [])

  useEffect(() => {
    if (!menuOpenId) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-menu-container]')) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpenId])

  const _handleCreateFolder = useCallback(async (name: string, parentId: string | null) => {
    const result = await handleApiCall(
      () => createFolder({ name, parent_id: parentId }),
      'Folder created',
      'Failed to create folder'
    )
    if (result) {
      setFolders(prev => [...prev, result])
    }
  }, [handleApiCall])

  const _handleUpdateFolder = useCallback(async (id: string, name: string) => {
    const result = await handleApiCall(
      () => updateFolder(id, { name }),
      'Folder renamed',
      'Failed to rename folder'
    )
    if (result) {
      setFolders(prev => prev.map(f => f.id === id ? result : f))
    }
  }, [handleApiCall])

  const _handleDeleteFolder = useCallback(async (id: string) => {
    const result = await handleApiCall(
      () => deleteFolder(id),
      'Folder deleted',
      'Failed to delete folder'
    )
    if (result !== undefined) {
      setFolders(prev => prev.filter(f => f.id !== id))
      if (selectedFolderId === id) {
        setSelectedFolderId(null)
      }
    }
  }, [handleApiCall, selectedFolderId])

  void _handleCreateFolder
  void _handleUpdateFolder
  void _handleDeleteFolder

  useEffect(() => {
    if (!autoSelectRef.current || editor.selectedId || presentations.length === 0) return
    autoSelectPresentation()
  }, [presentations, editor.selectedId, autoSelectPresentation])

  const filteredPresentations = useMemo(() => {
    let list = presentations
    if (selectedFolderId) {
      list = list.filter(p => p.folder_id === selectedFolderId)
    }
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [presentations, selectedFolderId])

  return (
    <div className="h-screen w-screen bg-secondary-50 dark:bg-secondary-900 flex overflow-hidden">
      {showAIModal && (
        <AIGenerationModal
          onClose={() => setShowAIModal(false)}
          onGenerate={handleAIGenerate}
        />
      )}

      <AssetManagerModal
        isOpen={showAssetModal}
        onClose={() => setShowAssetModal(false)}
      />

      <AIChatPanel
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        currentSlide={editor.content}
        currentSlideIndex={0}
        totalSlides={getCurrentSlideInfo().count}
        presentationTitle={editor.title}
        onApplyToCurrentSlide={handleApplyToCurrentSlide}
        onCreateNewPresentation={handleCreateNewPresentationFromChat}
        onInsertSlide={handleInsertSlide}
        onCreateTheme={handleCreateThemeFromChat}
      />

      <VersionHistoryPanel
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        presentationId={editor.selectedId}
        presentationTitle={editor.title || 'Untitled Presentation'}
        onRestore={handleVersionRestore}
      />

      <TemplateLibrary
        open={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelect={handleTemplateSelect}
      />

      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        presentationId={editor.selectedId}
        presentationTitle={editor.title || 'Untitled Presentation'}
      />

      <FontManager
        open={showFontManager}
        onClose={() => setShowFontManager(false)}
        onFontAdded={() => reloadThemes()}
      />

      <AnalyticsPanel
        open={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        presentationId={editor.selectedId}
        presentationTitle={editor.title || 'Untitled Presentation'}
      />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <AppSidebar
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        folders={folders}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
        filteredPresentations={filteredPresentations}
        selectedId={editor.selectedId}
        menuOpenId={menuOpenId}
        setMenuOpenId={setMenuOpenId}
        autosaveStatus={autosaveStatus}
        onNewPresentation={handleNewPresentation}
        onOpenAIModal={() => setShowAIModal(true)}
        onOpenAssetModal={() => setShowAssetModal(true)}
        onOpenAIChat={() => setShowAIChat(true)}
        onOpenTemplateLibrary={() => setShowTemplateLibrary(true)}
        onOpenFontManager={() => setShowFontManager(true)}
        onSelectPresentation={handleSelect}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />

      {/* Main Content: Editor + Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader
          title={editor.title}
          autosaveStatus={autosaveStatus}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          mobileView={mobileView}
          setMobileView={setMobileView}
          selectedId={editor.selectedId}
          content={editor.content}
          onContentChange={(content) => { markDirty(); editor.setContent(content) }}
          onOpenShareModal={() => setShowShareModal(true)}
          onOpenAnalytics={() => setShowAnalytics(true)}
          onOpenVersionHistory={() => setShowVersionHistory(true)}
          onExportPdf={() => editor.selectedId && editor.exportPresentation('pdf')}
        />

        {/* Editor + Preview Grid */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 p-2 sm:p-4 overflow-hidden">
          <div className={cn(
            "h-full overflow-hidden",
            mobileView === 'preview' ? "hidden lg:block" : "block"
          )}>
            <EditorPanel
              title={editor.title}
              content={editor.content}
              selectedTheme={editor.selectedTheme}
              selectedId={editor.selectedId}
              themes={themes}
              autosaveStatus={autosaveStatus}
              onReloadThemes={reloadThemes}
              onTitleChange={(title) => { markDirty(); editor.setTitle(title) }}
              onContentChange={(content) => { markDirty(); editor.setContent(content) }}
              onThemeChange={(theme) => {
                markDirty()
                editor.setSelectedTheme(theme || null)
              }}
              onExport={editor.exportPresentation}
              onCreateTheme={(data) => handleApiCall(
                () => createTheme(data),
                'Theme created',
                'Failed to create theme'
              )}
              onUpdateTheme={(id, data) => handleApiCall(
                () => updateTheme(id, data),
                'Theme updated',
                'Failed to update theme'
              )}
              onDeleteTheme={(id) => handleApiCall(
                () => deleteTheme(id),
                'Theme deleted',
                'Failed to delete theme'
              )}
            />
          </div>

          <div className={cn(
            "h-full overflow-hidden",
            mobileView === 'editor' ? "hidden lg:block" : "block"
          )}>
            <PreviewPanel
              preview={editor.preview}
              selectedId={editor.selectedId}
              previewLoading={editor.previewLoading}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
