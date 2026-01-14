import { useState, useEffect } from 'react'
import { Presentation, fetchPresentations, createPresentation, updatePresentation, deletePresentation, getPreview } from './api/client'
import './App.css'

function App() {
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPresentations()
  }, [])

  async function loadPresentations() {
    try {
      const data = await fetchPresentations()
      setPresentations(data)
    } catch (error) {
      console.error('Failed to load presentations:', error)
    }
  }

  async function handleCreate() {
    if (!title || !content) return
    setLoading(true)
    try {
      await createPresentation({ title, content })
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
      await updatePresentation(selectedId, { title, content })
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
        setSelectedId(null)
        setTitle('')
        setContent('')
      }
    } catch (error) {
      console.error('Failed to delete presentation:', error)
    }
  }

  async function handleSelect(pres: Presentation) {
    setSelectedId(pres.id)
    setTitle(pres.title)
    setContent(pres.content)
    try {
      const html = await getPreview(pres.id)
      setPreview(html)
    } catch (error) {
      console.error('Failed to load preview:', error)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ width: '250px', borderRight: '1px solid #ccc', padding: '20px', overflowY: 'auto' }}>
        <h2>Presentations</h2>
        <button onClick={() => { setSelectedId(null); setTitle(''); setContent(''); setPreview('') }}>
          New Presentation
        </button>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {presentations.map(p => (
            <li key={p.id} style={{ margin: '10px 0' }}>
              <div onClick={() => handleSelect(p)} style={{ cursor: 'pointer', padding: '5px', background: selectedId === p.id ? '#e3f2fd' : 'transparent' }}>
                {p.title}
              </div>
              <button onClick={() => handleDelete(p.id)} style={{ fontSize: '12px', marginTop: '5px' }}>Delete</button>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h1>Marp Presentation Builder</h1>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: '10px', marginBottom: '10px', fontSize: '16px' }}
        />
        <textarea
          placeholder="Markdown content (use ---\nmarp: true\n--- for Marp)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ flex: 1, padding: '10px', fontFamily: 'monospace', fontSize: '14px' }}
        />
        <div style={{ marginTop: '10px' }}>
          {selectedId ? (
            <button onClick={handleUpdate} disabled={loading}>Update</button>
          ) : (
            <button onClick={handleCreate} disabled={loading}>Create</button>
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
