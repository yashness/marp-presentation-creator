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
import { AnimatePresence, motion } from 'motion/react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconSparkles,
  IconDownload,
  IconPhoto,
  IconSearch,
  IconFolder,
  IconDotsVertical,
  IconTrash,
  IconCopy,
  IconMessageCircle,
  IconHistory,
  IconTemplate,
} from '@tabler/icons-react'

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
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
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

  // Get current slide info from content
  const getCurrentSlideInfo = useCallback(() => {
    const parsed = parseSlides(editor.content)
    return { slides: parsed.slides, count: parsed.slides.length }
  }, [editor.content])

  // Handle applying content to current slide
  const handleApplyToCurrentSlide = useCallback((content: string) => {
    editor.setContent(content)
    markDirty()
  }, [editor, markDirty])

  // Handle creating new presentation from chat
  const handleCreateNewPresentationFromChat = useCallback((content: string, title: string) => {
    editor.clearSelection()
    editor.setTitle(title)
    editor.setContent(content)
    setHasUserInput(true)
    setAutosaveEnabled(true)
    autoSelectRef.current = false
  }, [editor])

  // Handle inserting a new slide
  const handleInsertSlide = useCallback((content: string, afterIndex: number) => {
    const parsed = parseSlides(editor.content)
    // Insert new slide after the specified index
    const newSlide = {
      id: `slide-${Date.now()}`,
      content: content,
      comment: ''
    }
    const updatedSlides = [...parsed.slides]
    updatedSlides.splice(afterIndex + 1, 0, newSlide)
    editor.setContent(serializeSlides(parsed.frontmatter, updatedSlides))
    markDirty()
  }, [editor, markDirty])

  // Handle version restore
  const handleVersionRestore = useCallback((data: RestoreVersionResponse) => {
    editor.setTitle(data.title)
    editor.setContent(data.content)
    if (data.theme_id) {
      editor.setSelectedTheme(data.theme_id)
    }
    setHasUserInput(true)
  }, [editor])

  // Save checkpoint before major changes (exposed for external use)
  const _saveCheckpoint = useCallback(async (name?: string) => {
    if (!editor.selectedId) return
    await handleApiCall(
      () => createVersion(editor.selectedId!, name),
      'Checkpoint saved',
      'Failed to save checkpoint'
    )
  }, [editor.selectedId, handleApiCall])

  // Export checkpoint function for potential use
  void _saveCheckpoint

  // Handle theme creation from chat
  const handleCreateThemeFromChat = useCallback(async (colors: string[], name: string, description: string) => {
    // Build theme payload from extracted colors
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

  // Close menu when clicking outside
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

  // Folder handlers - prefixed with _ as they're defined for future use
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

  // Export handlers for potential use (they're defined above with _ prefix)
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

      {/* Collapsible Presentations Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 shadow-lg relative z-50"
      >
        {/* Logo & Collapse Toggle */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <div className="h-9 w-9 rounded-lg bg-primary-700 text-white font-bold text-xs grid place-items-center shadow-sm">
                  MP
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest font-medium text-slate-400">Marp</span>
                  <span className="text-sm font-bold text-primary-700 dark:text-primary-400">Builder</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 grid place-items-center text-slate-500 transition-colors"
          >
            {sidebarCollapsed ? <IconChevronRight className="w-4 h-4" /> : <IconChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Actions */}
        <div className={cn(
          "border-b border-slate-200 dark:border-slate-800 p-2 space-y-1",
          sidebarCollapsed && "px-2"
        )}>
          <button
            onClick={handleNewPresentation}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all",
              "bg-primary-500 hover:bg-primary-600 text-white shadow-md hover:shadow-lg",
              sidebarCollapsed && "px-0 justify-center"
            )}
          >
            <IconPlus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="text-sm">New</span>}
          </button>
          <button
            onClick={() => setShowAIModal(true)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all",
              "bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow",
              sidebarCollapsed && "px-0 justify-center"
            )}
          >
            <IconSparkles className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="text-sm">AI Generate</span>}
          </button>
          <button
            onClick={() => setShowAssetModal(true)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all",
              "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300",
              sidebarCollapsed && "px-0 justify-center"
            )}
          >
            <IconPhoto className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="text-sm">Assets</span>}
          </button>
          <button
            onClick={() => setShowAIChat(true)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all",
              "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-sm",
              sidebarCollapsed && "px-0 justify-center"
            )}
          >
            <IconMessageCircle className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="text-sm">AI Chat</span>}
          </button>
          <button
            onClick={() => setShowTemplateLibrary(true)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all",
              "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300",
              sidebarCollapsed && "px-0 justify-center"
            )}
          >
            <IconTemplate className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="text-sm">Templates</span>}
          </button>
        </div>

        {/* Search */}
        {!sidebarCollapsed && (
          <div className="p-2 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {/* Folders */}
        {!sidebarCollapsed && (
          <div className="px-2 py-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1 text-xs text-slate-500 px-2 mb-1">
              <IconFolder className="w-3 h-3" />
              <span>Folders</span>
            </div>
            <button
              onClick={() => setSelectedFolderId(null)}
              className={cn(
                "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                !selectedFolderId ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              )}
            >
              All presentations
            </button>
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                  selectedFolderId === folder.id ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                {folder.name}
              </button>
            ))}
          </div>
        )}

        {/* Presentations List */}
        <div className="flex-1 overflow-y-auto">
          {sidebarCollapsed ? (
            <div className="p-2 space-y-1">
              {filteredPresentations.slice(0, 10).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={cn(
                    "w-full h-10 rounded-lg grid place-items-center transition-colors",
                    editor.selectedId === p.id
                      ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                  )}
                  title={p.title}
                >
                  <span className="text-xs font-bold">{p.title.charAt(0).toUpperCase()}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredPresentations.map(p => (
                <div
                  key={p.id}
                  className={cn(
                    "group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
                    editor.selectedId === p.id
                      ? "bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
                  )}
                  onClick={() => handleSelect(p)}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      editor.selectedId === p.id ? "text-primary-800 dark:text-primary-300" : "text-slate-800 dark:text-slate-200"
                    )}>
                      {p.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="relative" data-menu-container>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId(menuOpenId === p.id ? null : p.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 grid place-items-center transition-all"
                    >
                      <IconDotsVertical className="w-4 h-4 text-slate-500" />
                    </button>
                    {menuOpenId === p.id && (
                      <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicate(p.id)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <IconCopy className="w-4 h-4" />
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(p.id)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <IconTrash className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-12 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center px-3">
          <div className={cn(
            "flex items-center gap-2",
            sidebarCollapsed && "justify-center"
          )}>
            <div className={cn(
              "h-2 w-2 rounded-full shrink-0",
              autosaveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
              autosaveStatus === 'saved' ? 'bg-green-500' :
              autosaveStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'
            )} />
            {!sidebarCollapsed && (
              <span className="text-xs font-medium text-slate-500">
                {autosaveStatus === 'saving' ? 'Saving…' :
                 autosaveStatus === 'saved' ? 'Saved' :
                 autosaveStatus === 'error' ? 'Error' : 'Ready'}
              </span>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content: Editor + Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200 truncate max-w-md">
              {editor.title || 'Untitled Presentation'}
            </h1>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={cn(
                "h-2 w-2 rounded-full",
                autosaveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
                autosaveStatus === 'saved' ? 'bg-green-500' :
                autosaveStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'
              )} />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {autosaveStatus === 'saving' ? 'Saving…' :
                 autosaveStatus === 'saved' ? 'All changes saved' :
                 autosaveStatus === 'error' ? 'Save failed' : 'Ready'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVersionHistory(true)}
              disabled={!editor.selectedId}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 text-sm font-medium transition-all"
              title="Version History (Cmd/Ctrl+Z to undo)"
            >
              <IconHistory className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={() => editor.selectedId && editor.exportPresentation('pdf')}
              disabled={!editor.selectedId}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow-md transition-all"
            >
              <IconDownload className="w-4 h-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </header>

        {/* Editor + Preview Grid */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
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

          <PreviewPanel
            preview={editor.preview}
            selectedId={editor.selectedId}
            previewLoading={editor.previewLoading}
          />
        </main>
      </div>

    </div>
  )
}

export default App
