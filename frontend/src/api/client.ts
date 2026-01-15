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
  folder_id?: string | null
  created_at: string
  updated_at: string
}

export interface PresentationCreate {
  title: string
  content: string
  theme_id?: string | null
  folder_id?: string | null
}

export interface PresentationUpdate {
  title?: string
  content?: string
  theme_id?: string | null
  folder_id?: string | null
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

export interface VideoExportRequest {
  voice?: string
  speed?: number
  slide_duration?: number
}

export interface VideoExportResponse {
  success: boolean
  video_url?: string
  message: string
}

export async function exportPresentationAsVideo(
  id: string,
  title: string,
  options?: VideoExportRequest
): Promise<void> {
  const request: VideoExportRequest = {
    voice: options?.voice || 'af_bella',
    speed: options?.speed || 1.0,
    slide_duration: options?.slide_duration || 5.0
  }

  const response = await fetch(buildUrl(`/video/${id}/export`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })

  const result = await handleResponse<VideoExportResponse>(response)

  if (!result.success || !result.video_url) {
    throw new Error(result.message || 'Video export failed')
  }

  const downloadResponse = await fetch(`${API_BASE}${result.video_url}`)
  const blob = await handleBlobResponse(downloadResponse)
  const safeTitle = title?.trim() ? title.trim() : 'presentation'
  downloadBlob(blob, `${safeTitle}.mp4`)
}

export interface SlideOutline {
  title: string
  content_points: string[]
  notes?: string
}

export interface PresentationOutline {
  title: string
  slides: SlideOutline[]
  narration_instructions?: string
  comment_max_ratio?: number
}

export interface GenerateOutlineResponse {
  success: boolean
  outline?: PresentationOutline
  message: string
}

export interface GenerateOutlineOptions {
  slide_count?: number
  subtopic_count?: number
  audience?: string
  flavor?: string
  narration_instructions?: string
  comment_max_ratio?: number
}

export interface GenerateContentResponse {
  success: boolean
  content?: string
  message: string
}

export interface RewriteSlideResponse {
  success: boolean
  content?: string
  message: string
}

export async function generateOutline(
  description: string,
  options?: GenerateOutlineOptions
): Promise<PresentationOutline> {
  const response = await fetch(buildUrl('/ai/generate-outline'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description,
      slide_count: options?.slide_count,
      subtopic_count: options?.subtopic_count,
      audience: options?.audience,
      flavor: options?.flavor,
      narration_instructions: options?.narration_instructions,
      comment_max_ratio: options?.comment_max_ratio,
    })
  })

  const result = await handleResponse<GenerateOutlineResponse>(response)

  if (!result.success || !result.outline) {
    throw new Error(result.message || 'Failed to generate outline')
  }

  return result.outline
}

export async function generateContent(outline: PresentationOutline, theme: string = 'professional'): Promise<string> {
  const response = await fetch(buildUrl('/ai/generate-content'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outline, theme })
  })

  const result = await handleResponse<GenerateContentResponse>(response)

  if (!result.success || !result.content) {
    throw new Error(result.message || 'Failed to generate content')
  }

  return result.content
}

export async function rewriteSlide(currentContent: string, instruction: string): Promise<string> {
  const response = await fetch(buildUrl('/ai/rewrite-slide'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_content: currentContent, instruction })
  })

  const result = await handleResponse<RewriteSlideResponse>(response)

  if (!result.success || !result.content) {
    throw new Error(result.message || 'Failed to rewrite slide')
  }

  return result.content
}

export interface GenerateImageResponse {
  success: boolean
  image_data?: string
  message: string
}

export async function generateImage(
  prompt: string,
  size: string = '1024x1024',
  quality: string = 'standard'
): Promise<string> {
  const response = await fetch(buildUrl('/ai/generate-image'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, size, quality })
  })

  const result = await handleResponse<GenerateImageResponse>(response)

  if (!result.success || !result.image_data) {
    throw new Error(result.message || 'Failed to generate image')
  }

  return result.image_data
}

export interface Folder {
  id: string
  name: string
  parent_id: string | null
  created_at: string
  updated_at: string
}

export interface FolderCreate {
  name: string
  parent_id?: string | null
}

export interface FolderUpdate {
  name?: string
  parent_id?: string | null
}

export async function fetchFolders(parentId?: string | null, all?: boolean): Promise<Folder[]> {
  const params: Record<string, string> = {}
  if (parentId !== undefined && parentId !== null) params.parent_id = parentId
  if (all) params.all = 'true'
  const url = buildUrl('/folders', params)
  const response = await fetch(url)
  return handleResponse<Folder[]>(response)
}

export async function createFolder(data: FolderCreate): Promise<Folder> {
  const response = await fetch(buildUrl('/folders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return handleResponse<Folder>(response)
}

export async function updateFolder(id: string, data: FolderUpdate): Promise<Folder> {
  const response = await fetch(buildUrl(`/folders/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return handleResponse<Folder>(response)
}

export async function deleteFolder(id: string): Promise<void> {
  const response = await fetch(buildUrl(`/folders/${id}`), { method: 'DELETE' })
  return handleVoidResponse(response)
}
