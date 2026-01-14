const API_BASE = 'http://localhost:8000/api'

export interface Presentation {
  id: string
  title: string
  content: string
  theme_id?: string | null
  created_at: string
  updated_at: string
}

export interface PresentationCreate {
  title: string
  content: string
  theme_id?: string | null
}

export interface PresentationUpdate {
  title?: string
  content?: string
  theme_id?: string | null
}

export async function fetchPresentations(query?: string, theme_id?: string | null): Promise<Presentation[]> {
  const params = new URLSearchParams()
  if (query) params.append('query', query)
  if (theme_id) params.append('theme_id', theme_id)
  const url = `${API_BASE}/presentations${params.toString() ? '?' + params.toString() : ''}`
  const response = await fetch(url)
  return response.json()
}

export async function createPresentation(data: PresentationCreate): Promise<Presentation> {
  const response = await fetch(`${API_BASE}/presentations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return response.json()
}

export async function updatePresentation(id: string, data: PresentationUpdate): Promise<Presentation> {
  const response = await fetch(`${API_BASE}/presentations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return response.json()
}

export async function deletePresentation(id: string): Promise<void> {
  await fetch(`${API_BASE}/presentations/${id}`, { method: 'DELETE' })
}

export async function getPreview(id: string): Promise<string> {
  const response = await fetch(`${API_BASE}/presentations/${id}/preview`)
  return response.text()
}
