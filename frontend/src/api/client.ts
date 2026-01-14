const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

function buildUrl(path: string, params?: Record<string, string>): string {
  const url = `${API_BASE}${path}`
  if (!params) return url
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.append(key, value)
  })
  return queryParams.toString() ? `${url}?${queryParams.toString()}` : url
}

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

async function checkResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error')
    throw new Error(`API error: ${response.status} - ${error}`)
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await checkResponse(response)
  return response.json()
}

async function handleTextResponse(response: Response): Promise<string> {
  await checkResponse(response)
  return response.text()
}

async function handleVoidResponse(response: Response): Promise<void> {
  await checkResponse(response)
}

export async function fetchPresentations(query?: string, theme_id?: string | null): Promise<Presentation[]> {
  const params: Record<string, string> = {}
  if (query) params.query = query
  if (theme_id) params.theme_id = theme_id
  const url = buildUrl('/presentations', params)
  const response = await fetch(url)
  return handleResponse<Presentation[]>(response)
}

export async function createPresentation(data: PresentationCreate): Promise<Presentation> {
  const response = await fetch(buildUrl('/presentations'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return handleResponse<Presentation>(response)
}

export async function updatePresentation(id: string, data: PresentationUpdate): Promise<Presentation> {
  const response = await fetch(buildUrl(`/presentations/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return handleResponse<Presentation>(response)
}

export async function deletePresentation(id: string): Promise<void> {
  const response = await fetch(buildUrl(`/presentations/${id}`), { method: 'DELETE' })
  return handleVoidResponse(response)
}

export async function getPreview(id: string): Promise<string> {
  const response = await fetch(buildUrl(`/presentations/${id}/preview`))
  return handleTextResponse(response)
}

async function handleBlobResponse(response: Response): Promise<Blob> {
  await checkResponse(response)
  return response.blob()
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

export async function exportPresentation(id: string, title: string, format: 'pdf' | 'html' | 'pptx'): Promise<void> {
  const response = await fetch(buildUrl(`/presentations/${id}/export`, { format }), { method: 'POST' })
  const blob = await handleBlobResponse(response)
  downloadBlob(blob, `${title}.${format}`)
}

export interface Theme {
  id: string
  name: string
  description: string
  css_content: string
  is_builtin: boolean
}

export async function fetchThemes(): Promise<Theme[]> {
  const response = await fetch(buildUrl('/themes'))
  return handleResponse<Theme[]>(response)
}
