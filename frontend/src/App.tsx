import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Presentation } from './api/client'
import { getPreview } from './api/client'
import { PresentationSidebar } from './components/PresentationSidebar'
import { EditorPanel } from './components/EditorPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { ToastContainer, useToast } from './components/ui/toast'
import { usePresentations } from './hooks/usePresentations'
import { usePresentationEditor } from './hooks/usePresentationEditor'
import { useApiHandler } from './hooks/useApiHandler'
import { useThemes } from './hooks/useThemes'
import { createSlug } from './lib/utils'
import { AUTOSAVE_DEBOUNCE_MS } from './lib/constants'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [hasUserInput, setHasUserInput] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [autosaveEnabled, setAutosaveEnabled] = useState(false)
  const { toasts, dismissToast } = useToast()
  const { handleApiCall } = useApiHandler()
  const { themes } = useThemes()
  const slugPendingRef = useRef<string | null>(null)
  const autoSelectRef = useRef(true)

  const editor = usePresentationEditor()
  const { presentations, create, update, remove } = usePresentations(searchQuery, editor.selectedTheme)

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
    const slug = pres.title ? createSlug(pres.title) : 'presentation'
    window.history.replaceState({}, '', `/slides/${slug}-${pres.id}`)
  }, [handleApiCall, editor.selectPresentation])

  const canAutosave = useMemo(() => editor.content.trim().length > 0, [editor.content])

  const createNewPresentation = useCallback(async (title: string, content: string, themeId: string | null) => {
    const created = await handleApiCall(
      () => create(title, content, themeId),
      '',
      'Failed to auto-save draft',
    )
    if (created) {
      editor.setCreatedMeta(created)
      const html = await getPreview(created.id)
      editor.setPreview(html)
      setHasUserInput(false)
      setAutosaveStatus('saved')
    } else {
      setAutosaveStatus('error')
    }
  }, [handleApiCall, create, editor.setCreatedMeta, editor.setPreview])

  const updateExistingPresentation = useCallback(async (id: string, title: string, content: string, themeId: string | null) => {
    const updated = await handleApiCall(
      () => update(id, title, content, themeId),
      '',
      'Failed to auto-save changes',
    )
    if (updated) {
      const html = await getPreview(updated.id)
      editor.setPreview(html)
      setHasUserInput(false)
      setAutosaveStatus('saved')
    } else {
      setAutosaveStatus('error')
    }
  }, [handleApiCall, update, editor.setPreview])

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
    if (!autoSelectRef.current) return
    if (editor.selectedId || presentations.length === 0) return
    if (!slugPendingRef.current) {
      const match = window.location.pathname.match(/\/slides\/([^/]+)$/)
      if (match) slugPendingRef.current = match[1]
    }
    const slugParam = slugPendingRef.current
    if (slugParam) {
      const maybeId = slugParam.split('-').slice(-1)[0]
      const candidate = presentations.find(p => p.id === maybeId)
      if (candidate) {
        handleSelect(candidate)
        slugPendingRef.current = null
        return
      }
    }
    // fallback to most recent
    const recent = [...presentations].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
    if (recent) {
      handleSelect(recent)
    }
    autoSelectRef.current = false
  }, [presentations, editor.selectedId, handleSelect])

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="flex h-screen bg-slate-50">
        <PresentationSidebar
          presentations={presentations}
          selectedId={editor.selectedId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onNewPresentation={() => {
            editor.clearSelection()
            setHasUserInput(false)
            setAutosaveEnabled(true)
            autoSelectRef.current = false
            window.history.replaceState({}, '', '/slides/new')
          }}
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
            editor.applyThemeToContent(theme || null)
          }}
          onExport={editor.exportPresentation}
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
