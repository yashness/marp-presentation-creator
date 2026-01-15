import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Presentation, Folder } from './api/client'
import { getPreview, fetchFolders, createFolder, updateFolder, deleteFolder } from './api/client'
import { PresentationSidebar } from './components/PresentationSidebar'
import { EditorPanel } from './components/EditorPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { AIGenerationModal } from './components/AIGenerationModal'
import { ToastContainer, useToast } from './components/ui/toast'
import { usePresentations } from './hooks/usePresentations'
import { usePresentationEditor } from './hooks/usePresentationEditor'
import { useApiHandler } from './hooks/useApiHandler'
import { useThemes } from './hooks/useThemes'
import { getMostRecentPresentation, extractIdFromSlug, updateBrowserUrl, getSlugFromUrl } from './lib/utils'
import { AUTOSAVE_DEBOUNCE_MS } from './lib/constants'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [hasUserInput, setHasUserInput] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [autosaveEnabled, setAutosaveEnabled] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const { toasts, dismissToast } = useToast()
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

  // Load folders on mount
  useEffect(() => {
    fetchFolders(undefined, true).then(setFolders).catch(console.error)
  }, [])

  // Folder handlers
  const handleCreateFolder = useCallback(async (name: string, parentId: string | null) => {
    const result = await handleApiCall(
      () => createFolder({ name, parent_id: parentId }),
      'Folder created',
      'Failed to create folder'
    )
    if (result) {
      setFolders(prev => [...prev, result])
    }
  }, [handleApiCall])

  const handleUpdateFolder = useCallback(async (id: string, name: string) => {
    const result = await handleApiCall(
      () => updateFolder(id, { name }),
      'Folder renamed',
      'Failed to rename folder'
    )
    if (result) {
      setFolders(prev => prev.map(f => f.id === id ? result : f))
    }
  }, [handleApiCall])

  const handleDeleteFolder = useCallback(async (id: string) => {
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

  const handleMovePresentation = useCallback(async (presentationId: string, folderId: string | null) => {
    await handleApiCall(
      () => update(presentationId, undefined, undefined, undefined, folderId),
      'Presentation moved',
      'Failed to move presentation'
    )
  }, [handleApiCall, update])

  // On initial load: if URL has /slides/<slug-uuid> try to select that; else pick most recent.
  useEffect(() => {
    if (!autoSelectRef.current || editor.selectedId || presentations.length === 0) return
    autoSelectPresentation()
  }, [presentations, editor.selectedId, autoSelectPresentation])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {showAIModal && (
        <AIGenerationModal
          onClose={() => setShowAIModal(false)}
          onGenerate={handleAIGenerate}
        />
      )}

      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm px-8 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white font-bold text-lg grid place-items-center shadow-lg">
            MP
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-medium text-slate-500">Marp Presentation</p>
            <p className="text-lg font-bold text-primary-700">Builder</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100">
            <div className={`h-2 w-2 rounded-full ${autosaveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' : autosaveStatus === 'saved' ? 'bg-green-500' : 'bg-slate-400'}`} />
            <span className="text-sm font-medium text-slate-700">
              {autosaveStatus === 'saving' ? 'Saving…' : autosaveStatus === 'saved' ? 'Saved' : 'Ready'}
            </span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 xl:grid-cols-[320px,1fr,1fr] gap-6 p-6 min-h-[calc(100vh-80px)]">
        <PresentationSidebar
          presentations={presentations}
          folders={folders}
          selectedId={editor.selectedId}
          selectedFolderId={selectedFolderId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onDuplicate={(id) => {
            handleApiCall(
              () => duplicate(id),
              'Presentation duplicated',
              'Failed to duplicate presentation',
            ).then(result => {
              if (result) {
                editor.selectPresentation(result)
              }
            })
          }}
          onNewPresentation={() => {
            editor.clearSelection()
            setHasUserInput(false)
            setAutosaveEnabled(true)
            autoSelectRef.current = false
            window.history.replaceState({}, '', '/slides/new')
          }}
          onAIGenerate={() => setShowAIModal(true)}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
          onMovePresentation={handleMovePresentation}
        />

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
  )
}

export default App
