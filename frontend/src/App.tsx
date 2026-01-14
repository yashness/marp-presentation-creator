import { useState, useCallback } from 'react'
import type { Presentation } from './api/client'
import { PresentationSidebar } from './components/PresentationSidebar'
import { EditorPanel } from './components/EditorPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { ToastContainer, useToast } from './components/ui/toast'
import { usePresentations } from './hooks/usePresentations'
import { usePresentationEditor } from './hooks/usePresentationEditor'
import { usePresentationValidation } from './hooks/usePresentationValidation'
import { useApiHandler } from './hooks/useApiHandler'
import { useThemes } from './hooks/useThemes'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const { toasts, showToast, dismissToast } = useToast()
  const validation = usePresentationValidation()
  const { handleApiCall } = useApiHandler()
  const { themes } = useThemes()

  const editor = usePresentationEditor()
  const { presentations, loading, create, update, remove } = usePresentations(searchQuery, editor.selectedTheme)

  const validateAndShowError = useCallback((error: string | null): boolean => {
    if (error) {
      showToast(error, 'error')
      return false
    }
    return true
  }, [showToast])

  const handleCreate = useCallback(async () => {
    const error = validation.validateCreate(editor.title, editor.content)
    if (!validateAndShowError(error)) return
    const result = await handleApiCall(
      () => create(editor.title, editor.content, editor.selectedTheme),
      'Presentation created successfully',
      'Failed to create presentation',
    )
    if (result) editor.clearSelection()
  }, [validation, editor.title, editor.content, editor.selectedTheme, editor.clearSelection, validateAndShowError, handleApiCall, create])

  const handleUpdate = useCallback(async () => {
    const error = validation.validateUpdate(editor.selectedId, editor.title, editor.content)
    if (!validateAndShowError(error)) return
    await handleApiCall(
      () => update(editor.selectedId!, editor.title, editor.content, editor.selectedTheme),
      'Presentation updated successfully',
      'Failed to update presentation',
    )
  }, [validation, editor.selectedId, editor.title, editor.content, editor.selectedTheme, validateAndShowError, handleApiCall, update])

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
  }, [handleApiCall, editor.selectPresentation])

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="flex h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <PresentationSidebar
          presentations={presentations}
          selectedId={editor.selectedId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onNewPresentation={editor.clearSelection}
        />

        <EditorPanel
          title={editor.title}
          content={editor.content}
          selectedTheme={editor.selectedTheme}
          selectedId={editor.selectedId}
          loading={loading}
          themes={themes}
          onTitleChange={editor.setTitle}
          onContentChange={editor.setContent}
          onThemeChange={editor.setSelectedTheme}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onExport={editor.exportPresentation}
          onPreview={editor.refreshPreview}
          previewLoading={editor.previewLoading}
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
