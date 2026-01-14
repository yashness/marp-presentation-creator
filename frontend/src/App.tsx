import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Presentation } from './api/client'
import { getPreview } from './api/client'
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
  const { toasts, dismissToast } = useToast()
  const { handleApiCall } = useApiHandler()
  const { themes, createTheme, updateTheme, deleteTheme } = useThemes()
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

  // On initial load: if URL has /slides/<slug-uuid> try to select that; else pick most recent.
  useEffect(() => {
    if (!autoSelectRef.current || editor.selectedId || presentations.length === 0) return
    autoSelectPresentation()
  }, [presentations, editor.selectedId, autoSelectPresentation])

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {showAIModal && (
        <AIGenerationModal
          onClose={() => setShowAIModal(false)}
          onGenerate={handleAIGenerate}
        />
      )}
      <div className="flex h-screen bg-gradient-to-br from-primary-50/40 via-white to-secondary-50/40">
        <PresentationSidebar
          presentations={presentations}
          selectedId={editor.selectedId}
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
        />

        <EditorPanel
          title={editor.title}
          content={editor.content}
          selectedTheme={editor.selectedTheme}
          selectedId={editor.selectedId}
          themes={themes}
          autosaveStatus={autosaveStatus}
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
      </div>
    </>
  )
}

export default App
