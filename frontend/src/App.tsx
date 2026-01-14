import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Presentation, fetchPresentations, createPresentation, updatePresentation, deletePresentation, getPreview } from './api/client'
import './App.css'

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
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ width: '250px', borderRight: '1px solid #ccc', padding: '20px', overflowY: 'auto' }}>
        <h2>Presentations</h2>
        <button onClick={clearSelection} style={{ marginBottom: '10px', width: '100%' }}>New Presentation</button>
        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', marginBottom: '5px', padding: '5px' }} />
        <button onClick={handleSearch} style={{ width: '100%', marginBottom: '10px' }}>Search</button>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {presentations.map(p => (
            <li key={p.id} style={{ margin: '10px 0' }}>
              <div onClick={() => handleSelect(p)} style={{ cursor: 'pointer', padding: '5px', background: selectedId === p.id ? '#e3f2fd' : 'transparent' }}>{p.title}</div>
              <button onClick={() => handleDelete(p.id)} style={{ fontSize: '12px', marginTop: '5px' }}>Delete</button>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h1>Marp Presentation Builder</h1>
        <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: '10px', marginBottom: '10px', fontSize: '16px' }} />
        <select value={selectedTheme || ''} onChange={(e) => setSelectedTheme(e.target.value || null)} style={{ padding: '10px', marginBottom: '10px' }}>
          <option value="">Default Theme</option>
          <option value="corporate">Corporate</option>
          <option value="academic">Academic</option>
        </select>
        <div style={{ flex: 1, marginBottom: '10px', border: '1px solid #ccc' }}>
          <Editor height="100%" defaultLanguage="markdown" value={content} onChange={(value) => setContent(value || '')} theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 14 }} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedId ? (
            <button onClick={handleUpdate} disabled={loading}>Update</button>
          ) : (
            <button onClick={handleCreate} disabled={loading}>Create</button>
          )}
          {selectedId && (
            <>
              <button onClick={() => handleExport('pdf')}>Export PDF</button>
              <button onClick={() => handleExport('html')}>Export HTML</button>
              <button onClick={() => handleExport('pptx')}>Export PPTX</button>
            </>
          )}
        </div>
      </div>

      {preview && (
        <div style={{ width: '50%', borderLeft: '1px solid #ccc', padding: '20px', overflowY: 'auto' }}>
          <h2>Preview</h2>
          <iframe srcDoc={preview} style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
      )}
    </div>
  )
}

export default App
