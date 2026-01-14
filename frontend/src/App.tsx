import { useState } from 'react'
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

  function validateAndShowError(error: string | null): boolean {
    if (error) {
      showToast(error, 'error')
      return false
    }
    return true
  }

  async function handleCreate() {
    const error = validation.validateCreate(editor.title, editor.content)
    if (!validateAndShowError(error)) return
    const result = await handleApiCall(
      () => create(editor.title, editor.content, editor.selectedTheme),
      'Presentation created successfully',
      'Failed to create presentation',
    )
    if (result) editor.clearSelection()
  }

  async function handleUpdate() {
    const error = validation.validateUpdate(editor.selectedId, editor.title, editor.content)
    if (!validateAndShowError(error)) return
    await handleApiCall(
      () => update(editor.selectedId!, editor.title, editor.content, editor.selectedTheme),
      'Presentation updated successfully',
      'Failed to update presentation',
    )
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this presentation?')) return
    const result = await handleApiCall(
      () => remove(id),
      'Presentation deleted successfully',
      'Failed to delete presentation',
    )
    if (result && editor.selectedId === id) {
      editor.clearSelection()
    }
  }

  async function handleSelect(pres: Presentation) {
    await handleApiCall(
      () => editor.selectPresentation(pres),
      '',
      'Failed to load presentation',
    )
  }

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
