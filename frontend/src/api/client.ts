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

  const downloadUrl = result.video_url.startsWith('http')
    ? result.video_url
    : `${API_BASE_URL}${result.video_url}`
  const downloadResponse = await fetch(downloadUrl)
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

export interface RewriteSelectedTextResponse {
  success: boolean
  content?: string
  rewritten_text?: string
  message: string
}

export async function rewriteSelectedText(
  fullContent: string,
  selectedText: string,
  instruction: string,
  selectionStart: number,
  selectionEnd: number
): Promise<{ content: string; rewrittenText: string }> {
  const response = await fetch(buildUrl('/ai/rewrite-selected-text'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_content: fullContent,
      selected_text: selectedText,
      instruction,
      selection_start: selectionStart,
      selection_end: selectionEnd
    })
  })

  const result = await handleResponse<RewriteSelectedTextResponse>(response)

  if (!result.success || !result.content) {
    throw new Error(result.message || 'Failed to rewrite selected text')
  }

  return {
    content: result.content,
    rewrittenText: result.rewritten_text || ''
  }
}

export interface RegenerateCommentResponse {
  success: boolean
  comment?: string
  message: string
}

export async function regenerateComment(
  slideContent: string,
  previousComment?: string,
  contextBefore?: string,
  contextAfter?: string,
  style: string = 'professional'
): Promise<string> {
  const response = await fetch(buildUrl('/ai/regenerate-comment'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slide_content: slideContent,
      previous_comment: previousComment,
      context_before: contextBefore,
      context_after: contextAfter,
      style
    })
  })

  const result = await handleResponse<RegenerateCommentResponse>(response)

  if (!result.success || !result.comment) {
    throw new Error(result.message || 'Failed to regenerate comment')
  }

  return result.comment
}

export interface RegenerateAllCommentsResponse {
  success: boolean
  comments?: string[]
  message: string
}

export async function regenerateAllComments(
  slides: Array<{ content: string; comment?: string }>,
  style: string = 'professional'
): Promise<string[]> {
  const response = await fetch(buildUrl('/ai/regenerate-all-comments'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides, style })
  })

  const result = await handleResponse<RegenerateAllCommentsResponse>(response)

  if (!result.success || !result.comments) {
    throw new Error(result.message || 'Failed to regenerate comments')
  }

  return result.comments
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

// Generate Commentary (audio-aware)
export interface GenerateCommentaryResponse {
  success: boolean
  comments?: string[]
  message: string
}

export async function generateCommentary(
  slides: Array<{ content: string }>,
  style: string = 'professional'
): Promise<string[]> {
  const response = await fetch(buildUrl('/ai/generate-commentary'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides, style })
  })

  const result = await handleResponse<GenerateCommentaryResponse>(response)

  if (!result.success || !result.comments) {
    throw new Error(result.message || 'Failed to generate commentary')
  }

  return result.comments
}

// Slide Operations (layout, restyle, simplify, expand, split)
export interface SlideOperationResponse {
  success: boolean
  content?: string
  slides?: string[]
  message: string
}

export type SlideOperation = 'layout' | 'restyle' | 'simplify' | 'expand' | 'split'

export async function performSlideOperation(
  content: string,
  operation: SlideOperation,
  style?: string
): Promise<{ content?: string; slides?: string[] }> {
  const response = await fetch(buildUrl('/ai/slide-operation'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, operation, style })
  })

  const result = await handleResponse<SlideOperationResponse>(response)

  if (!result.success) {
    throw new Error(result.message || 'Operation failed')
  }

  return { content: result.content, slides: result.slides }
}

// Layout types and operations
export interface LayoutInfo {
  name: string
  icon: string
  description: string
  html: string
}

export interface LayoutsResponse {
  layouts: Record<string, LayoutInfo>
  diagrams?: Record<string, LayoutInfo>
  callouts: Record<string, LayoutInfo>
}

export async function getLayouts(): Promise<LayoutsResponse> {
  const response = await fetch(buildUrl('/ai/layouts'))
  return handleResponse<LayoutsResponse>(response)
}

export async function applyLayout(content: string, layoutType: string): Promise<string> {
  const response = await fetch(buildUrl('/ai/apply-layout'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, layout_type: layoutType })
  })

  const result = await handleResponse<{ success: boolean; content?: string; message: string }>(response)

  if (!result.success || !result.content) {
    throw new Error(result.message || 'Failed to apply layout')
  }

  return result.content
}

export async function duplicateAndRewrite(content: string, newTopic: string): Promise<string> {
  const response = await fetch(buildUrl('/ai/duplicate-rewrite'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, new_topic: newTopic })
  })

  const result = await handleResponse<{ success: boolean; content?: string; message: string }>(response)

  if (!result.success || !result.content) {
    throw new Error(result.message || 'Failed to rewrite')
  }

  return result.content
}

export async function rearrangeSlides(slides: string[]): Promise<string[]> {
  const response = await fetch(buildUrl('/ai/rearrange-slides'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides })
  })

  const result = await handleResponse<{ success: boolean; slides?: string[]; message: string }>(response)

  if (!result.success || !result.slides) {
    throw new Error(result.message || 'Failed to rearrange')
  }

  return result.slides
}

export type TransformStyle = 'story' | 'teaching' | 'pitch' | 'workshop' | 'technical' | 'executive'

export async function transformStyle(slides: string[], style: TransformStyle): Promise<string[]> {
  const response = await fetch(buildUrl('/ai/transform-style'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides, style })
  })

  const result = await handleResponse<{ success: boolean; slides?: string[]; message: string }>(response)

  if (!result.success || !result.slides) {
    throw new Error(result.message || 'Failed to transform')
  }

  return result.slides
}

export async function rewriteForTopic(
  slides: string[],
  newTopic: string,
  keepStyle: boolean = true
): Promise<string[]> {
  const response = await fetch(buildUrl('/ai/rewrite-for-topic'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides, new_topic: newTopic, keep_style: keepStyle })
  })

  const result = await handleResponse<{ success: boolean; slides?: string[]; message: string }>(response)

  if (!result.success || !result.slides) {
    throw new Error(result.message || 'Failed to rewrite')
  }

  return result.slides
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

// Async Video Export with Polling
export interface VideoExportStartResponse {
  job_id: string
  message: string
}

export interface VideoJobProgress {
  job_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  current_stage: string
  total_slides: number
  processed_slides: number
  error: string | null
  video_url: string | null
}

export interface VideoExistsResponse {
  exists: boolean
  video_url: string | null
  file_size: number | null
  active_job_id: string | null
}

export async function startVideoExportAsync(
  id: string,
  options?: VideoExportRequest
): Promise<VideoExportStartResponse> {
  const request: VideoExportRequest = {
    voice: options?.voice || 'af_bella',
    speed: options?.speed || 1.0,
    slide_duration: options?.slide_duration || 5.0
  }

  const response = await fetch(buildUrl(`/video/${id}/export-async`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })

  return handleResponse<VideoExportStartResponse>(response)
}

export async function getVideoJobProgress(jobId: string): Promise<VideoJobProgress> {
  const response = await fetch(buildUrl(`/video/job/${jobId}/progress`))
  return handleResponse<VideoJobProgress>(response)
}

export async function cancelVideoJob(jobId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(buildUrl(`/video/job/${jobId}/cancel`), { method: 'POST' })
  return handleResponse<{ success: boolean; message: string }>(response)
}

export async function checkVideoExists(presentationId: string): Promise<VideoExistsResponse> {
  const response = await fetch(buildUrl(`/video/${presentationId}/exists`))
  return handleResponse<VideoExistsResponse>(response)
}

// Chat API for streaming AI responses
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  context?: string | null
  mode?: 'general' | 'outline' | 'slide' | 'refine'
  current_slide?: string | null
}

export interface ChatStatusResponse {
  available: boolean
  streaming: boolean
  modes: string[]
}

export async function getChatStatus(): Promise<ChatStatusResponse> {
  const response = await fetch(buildUrl('/chat/status'))
  return handleResponse<ChatStatusResponse>(response)
}

// URL Scraping API
export interface ScrapeResponse {
  success: boolean
  url: string
  title?: string | null
  description?: string | null
  content?: string | null
  site_name?: string | null
  content_type?: string | null
  error?: string | null
}

export async function scrapeUrl(url: string, maxContentLength: number = 10000): Promise<ScrapeResponse> {
  const response = await fetch(buildUrl('/scraper'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, max_content_length: maxContentLength })
  })
  return handleResponse<ScrapeResponse>(response)
}

// Conversation Persistence API
export interface Conversation {
  id: string
  presentation_id: string | null
  mode: string
  created_at: string
  updated_at: string
  messages?: ConversationMessage[]
}

export interface ConversationMessage {
  id: string
  role: string
  content: string
  thinking?: string | null
  message_order: number
  extra_data?: Record<string, unknown> | null
  created_at: string
}

export async function createConversation(
  presentationId?: string | null,
  mode: string = 'general'
): Promise<Conversation> {
  const response = await fetch(buildUrl('/conversations'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presentation_id: presentationId, mode })
  })
  return handleResponse<Conversation>(response)
}

export async function listConversations(
  presentationId?: string | null,
  limit: number = 20
): Promise<Conversation[]> {
  const params: Record<string, string> = { limit: String(limit) }
  if (presentationId) params.presentation_id = presentationId
  const response = await fetch(buildUrl('/conversations', params))
  return handleResponse<Conversation[]>(response)
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await fetch(buildUrl(`/conversations/${conversationId}`))
  return handleResponse<Conversation>(response)
}

export async function addMessageToConversation(
  conversationId: string,
  role: string,
  content: string,
  thinking?: string | null,
  extraData?: Record<string, unknown> | null
): Promise<ConversationMessage> {
  const response = await fetch(buildUrl(`/conversations/${conversationId}/messages`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content, thinking, extra_data: extraData })
  })
  return handleResponse<ConversationMessage>(response)
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(buildUrl(`/conversations/${conversationId}`), { method: 'DELETE' })
  return handleVoidResponse(response)
}

// Presentation Versioning API
export interface PresentationVersion {
  id: string
  presentation_id: string
  version_number: number
  title: string
  content: string
  theme_id?: string | null
  checkpoint_name?: string | null
  created_at: string
}

export interface RestoreVersionResponse {
  id: string
  title: string
  content: string
  theme_id?: string | null
  restored_from: number
}

export async function createVersion(
  presentationId: string,
  checkpointName?: string | null
): Promise<PresentationVersion> {
  const response = await fetch(buildUrl('/versions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presentation_id: presentationId, checkpoint_name: checkpointName })
  })
  return handleResponse<PresentationVersion>(response)
}

export async function listVersions(presentationId: string): Promise<PresentationVersion[]> {
  const response = await fetch(buildUrl(`/versions/presentation/${presentationId}`))
  return handleResponse<PresentationVersion[]>(response)
}

export async function getVersion(versionId: string): Promise<PresentationVersion> {
  const response = await fetch(buildUrl(`/versions/${versionId}`))
  return handleResponse<PresentationVersion>(response)
}

export async function restoreVersion(versionId: string): Promise<RestoreVersionResponse> {
  const response = await fetch(buildUrl(`/versions/${versionId}/restore`), { method: 'POST' })
  return handleResponse<RestoreVersionResponse>(response)
}

export async function deleteVersion(versionId: string): Promise<void> {
  const response = await fetch(buildUrl(`/versions/${versionId}`), { method: 'DELETE' })
  return handleVoidResponse(response)
}

// Agent API for agentic workflows
export interface AgentRequest {
  message: string
  presentation_id?: string | null
  conversation_id?: string | null
}

export interface AgentToolUse {
  name: string
  input: Record<string, unknown>
}

export interface AgentResponse {
  response: string
  tool_uses: AgentToolUse[]
  success: boolean
}

export interface AgentTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface AgentStatusResponse {
  available: boolean
  tools: string[]
}

export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const response = await fetch(buildUrl('/agent/run'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  return handleResponse<AgentResponse>(response)
}

export async function getAgentStatus(): Promise<AgentStatusResponse> {
  const response = await fetch(buildUrl('/agent/status'))
  return handleResponse<AgentStatusResponse>(response)
}

export async function getAgentTools(): Promise<{ tools: AgentTool[] }> {
  const response = await fetch(buildUrl('/agent/tools'))
  return handleResponse<{ tools: AgentTool[] }>(response)
}

// Template API
export interface Template {
  id: string
  name: string
  description: string | null
  category: string
  content: string
  theme_id: string | null
  thumbnail_url: string | null
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface TemplateCategory {
  name: string
  description: string
  count: number
}

export async function fetchTemplates(category?: string): Promise<Template[]> {
  const params: Record<string, string> = {}
  if (category) params.category = category
  const response = await fetch(buildUrl('/templates', params))
  return handleResponse<Template[]>(response)
}

export async function fetchTemplateCategories(): Promise<TemplateCategory[]> {
  const response = await fetch(buildUrl('/templates/categories'))
  return handleResponse<TemplateCategory[]>(response)
}

export async function getTemplate(templateId: string): Promise<Template> {
  const response = await fetch(buildUrl(`/templates/${templateId}`))
  return handleResponse<Template>(response)
}

// Streaming agent with SSE
export function streamAgent(
  request: AgentRequest,
  callbacks: {
    onText?: (content: string) => void
    onToolUse?: (name: string, input: Record<string, unknown>) => void
    onToolResult?: (name: string, result: unknown) => void
    onDone?: (response: string) => void
    onError?: (message: string) => void
  }
): () => void {
  const controller = new AbortController()

  fetch(buildUrl('/agent/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: controller.signal
  }).then(async response => {
    if (!response.ok) {
      callbacks.onError?.(`HTTP ${response.status}`)
      return
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      callbacks.onError?.('No response body')
      return
    }

    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.content) callbacks.onText?.(data.content)
            if (data.name && data.input) callbacks.onToolUse?.(data.name, data.input)
            if (data.result) callbacks.onToolResult?.(data.name, data.result)
            if (data.response) callbacks.onDone?.(data.response)
            if (data.message && line.includes('error')) callbacks.onError?.(data.message)
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }).catch(error => {
    if (error.name !== 'AbortError') {
      callbacks.onError?.(error.message)
    }
  })

  return () => controller.abort()
}
