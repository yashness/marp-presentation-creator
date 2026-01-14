import { useState, useEffect } from 'react'
import type { Presentation } from './api/client'
import { fetchPresentations, createPresentation, updatePresentation, deletePresentation, getPreview } from './api/client'
import { PresentationSidebar } from './components/PresentationSidebar'
import { EditorPanel } from './components/EditorPanel'
import { PreviewPanel } from './components/PreviewPanel'

function App() {
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  useEffect(() => {
    loadPresentations()
  }, [])

  async function loadPresentations() {
    try {
      const data = await fetchPresentations(searchQuery, selectedTheme)
      setPresentations(data)
    } catch (error) {
      console.error('Failed to load presentations:', error)
    }
  }

  async function handleCreate() {
    if (!title || !content) return
    setLoading(true)
    try {
      await createPresentation({ title, content, theme_id: selectedTheme })
      setTitle('')
      setContent('')
      await loadPresentations()
    } catch (error) {
      console.error('Failed to create presentation:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    if (!selectedId || !title || !content) return
    setLoading(true)
    try {
      await updatePresentation(selectedId, { title, content, theme_id: selectedTheme })
      await loadPresentations()
    } catch (error) {
      console.error('Failed to update presentation:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this presentation?')) return
    try {
      await deletePresentation(id)
      await loadPresentations()
      if (selectedId === id) {
        clearSelection()
      }
    } catch (error) {
      console.error('Failed to delete presentation:', error)
    }
  }

  function clearSelection() {
    setSelectedId(null)
    setTitle('')
    setContent('')
    setPreview('')
    setSelectedTheme(null)
  }

  async function handleSelect(pres: Presentation) {
    setSelectedId(pres.id)
    setTitle(pres.title)
    setContent(pres.content)
    setSelectedTheme(pres.theme_id || null)
    try {
      const html = await getPreview(pres.id)
      setPreview(html)
    } catch (error) {
      console.error('Failed to load preview:', error)
    }
  }

  async function handlePreview() {
    if (!selectedId) return
    try {
      const html = await getPreview(selectedId)
      setPreview(html)
    } catch (error) {
      console.error('Failed to load preview:', error)
    }
  }

  async function handleExport(format: 'pdf' | 'html' | 'pptx') {
    if (!selectedId) return
    try {
      const response = await fetch(`http://localhost:8000/api/presentations/${selectedId}/export?format=${format}`, { method: 'POST' })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title}.${format}`
      link.click()
    } catch (error) {
      console.error('Failed to export:', error)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <PresentationSidebar
        presentations={presentations}
        selectedId={selectedId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={loadPresentations}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onNewPresentation={clearSelection}
      />

      <EditorPanel
        title={title}
        content={content}
        selectedTheme={selectedTheme}
        selectedId={selectedId}
        loading={loading}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onThemeChange={setSelectedTheme}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onExport={handleExport}
        onPreview={handlePreview}
      />

      <PreviewPanel
        preview={preview}
        selectedId={selectedId}
      />
    </div>
  )
}

export default App
