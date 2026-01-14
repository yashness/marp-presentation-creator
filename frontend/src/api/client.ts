import { API_BASE_URL } from '../lib/constants'

const API_BASE = `${API_BASE_URL}/api`

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

export async function duplicatePresentation(id: string): Promise<Presentation> {
  const response = await fetch(buildUrl(`/presentations/${id}/duplicate`), { method: 'POST' })
  return handleResponse<Presentation>(response)
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
  const safeTitle = title?.trim() ? title.trim() : 'presentation'
  downloadBlob(blob, `${safeTitle}.${format}`)
}

export interface Theme {
  id: string
  name: string
  description: string
  css_content: string
  is_builtin: boolean
  colors?: ThemeColors
  typography?: ThemeTypography
  spacing?: ThemeSpacing
}

export interface ThemeColors {
  background: string
  text: string
  h1: string
  h2: string
  h3: string
  link: string
  code_background: string
  code_text: string
  code_block_background: string
  code_block_text: string
}

export interface ThemeTypography {
  font_family: string
  font_size: string
  h1_size: string
  h1_weight: string
  h2_size: string
  h2_weight: string
  h3_size: string
  h3_weight: string
  code_font_family: string
}

export interface ThemeSpacing {
  slide_padding: string
  h1_margin_bottom: string
  h2_margin_top: string
  code_padding: string
  code_block_padding: string
  border_radius: string
  code_block_border_radius: string
}

export interface ThemeCreatePayload {
  name: string
  description?: string | null
  colors: ThemeColors
  typography: ThemeTypography
  spacing: ThemeSpacing
}

export async function fetchThemes(): Promise<Theme[]> {
  const response = await fetch(buildUrl('/themes'))
  return handleResponse<Theme[]>(response)
}

export async function createTheme(data: ThemeCreatePayload): Promise<Theme> {
  const response = await fetch(buildUrl('/themes'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return handleResponse<Theme>(response)
}

export async function updateTheme(themeId: string, data: ThemeCreatePayload): Promise<Theme> {
  const response = await fetch(buildUrl(`/themes/${themeId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return handleResponse<Theme>(response)
}

export async function deleteTheme(themeId: string): Promise<void> {
  const response = await fetch(buildUrl(`/themes/${themeId}`), { method: 'DELETE' })
  return handleVoidResponse(response)
}
