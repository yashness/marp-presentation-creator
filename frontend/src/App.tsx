import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import type { Presentation } from './api/client'
import { fetchPresentations, createPresentation, updatePresentation, deletePresentation, getPreview } from './api/client'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Select } from './components/ui/select'
import { Plus, Search, Trash2, FileDown, Eye, Presentation as PresentationIcon, Loader2 } from 'lucide-react'

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

  async function handleSearch() {
    await loadPresentations()
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
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-primary-200 shadow-lg flex flex-col">
        <div className="p-6 border-b border-primary-200">
          <h2 className="text-2xl font-bold text-primary-900 flex items-center gap-2 mb-4">
            <PresentationIcon className="w-6 h-6 text-primary-600" />
            Presentations
          </h2>
          <Button onClick={clearSelection} className="w-full" variant="default">
            <Plus className="w-4 h-4" />
            New Presentation
          </Button>
        </div>

        <div className="p-4 border-b border-primary-200">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} size="icon" variant="outline">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto p-2 space-y-2">
          {presentations.map(p => (
            <li key={p.id} className="group">
              <div
                onClick={() => handleSelect(p)}
                className={`cursor-pointer p-3 rounded-md transition-all ${
                  selectedId === p.id
                    ? 'bg-primary-100 border-l-4 border-primary-600'
                    : 'hover:bg-primary-50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 truncate flex-1">{p.title}</span>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(p.id)
                    }}
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-6">
            Marp Presentation Builder
          </h1>

          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Presentation Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />

            <Select
              value={selectedTheme || ''}
              onChange={(e) => setSelectedTheme(e.target.value || null)}
            >
              <option value="">Default Theme</option>
              <option value="corporate">Corporate</option>
              <option value="academic">Academic</option>
            </Select>
          </div>
        </div>

        <div className="flex-1 mb-4 border border-primary-300 rounded-lg overflow-hidden shadow-md">
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={content}
            onChange={(value) => setContent(value || '')}
            theme="vs-dark"
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>

        <div className="flex gap-3">
          {selectedId ? (
            <Button onClick={handleUpdate} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Update
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </Button>
          )}
          {selectedId && (
            <>
              <Button onClick={() => handleExport('pdf')} variant="secondary">
                <FileDown className="w-4 h-4" />
                PDF
              </Button>
              <Button onClick={() => handleExport('html')} variant="secondary">
                <FileDown className="w-4 h-4" />
                HTML
              </Button>
              <Button onClick={() => handleExport('pptx')} variant="secondary">
                <FileDown className="w-4 h-4" />
                PPTX
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      {preview && (
        <div className="w-1/2 bg-white border-l border-primary-200 shadow-lg flex flex-col">
          <div className="p-6 border-b border-primary-200">
            <h2 className="text-2xl font-bold text-primary-900 flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary-600" />
              Preview
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <iframe
              srcDoc={preview}
              className="w-full h-full border-0 rounded-lg shadow-sm"
              title="Presentation Preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
