import { useState } from 'react'
import type { Presentation } from './api/client'
import { PresentationSidebar } from './components/PresentationSidebar'
import { EditorPanel } from './components/EditorPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { ToastContainer, useToast } from './components/ui/toast'
import { usePresentations } from './hooks/usePresentations'
import { usePresentationEditor } from './hooks/usePresentationEditor'
import { usePresentationValidation } from './hooks/usePresentationValidation'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const { toasts, showToast, dismissToast } = useToast()
  const validation = usePresentationValidation()

  const editor = usePresentationEditor()
  const { presentations, loading, loadPresentations, create, update, remove } = usePresentations(searchQuery, editor.selectedTheme)

  async function handleCreate() {
    const error = validation.validateCreate(editor.title, editor.content)
    if (error) {
      showToast(error, 'error')
      return
    }
    try {
      await create(editor.title, editor.content, editor.selectedTheme)
      editor.clearSelection()
      showToast('Presentation created successfully', 'success')
    } catch (error) {
      showToast('Failed to create presentation', 'error')
    }
  }

  async function handleUpdate() {
    const error = validation.validateUpdate(editor.selectedId, editor.title, editor.content)
    if (error) {
      showToast(error, 'error')
      return
    }
    try {
      await update(editor.selectedId!, editor.title, editor.content, editor.selectedTheme)
      showToast('Presentation updated successfully', 'success')
    } catch (error) {
      showToast('Failed to update presentation', 'error')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this presentation?')) return
    try {
      await remove(id)
      if (editor.selectedId === id) {
        editor.clearSelection()
      }
      showToast('Presentation deleted successfully', 'success')
    } catch (error) {
      showToast('Failed to delete presentation', 'error')
    }
  }

  async function handleSelect(pres: Presentation) {
    try {
      await editor.selectPresentation(pres)
    } catch (error) {
      showToast('Failed to load presentation', 'error')
    }
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
