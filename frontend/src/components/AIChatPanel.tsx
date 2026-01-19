import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './ui/button'
import {
  MessageSquare,
  Sparkles,
  X,
  FileText,
  Link as LinkIcon,
  Loader2,
  Bot,
  Lightbulb,
  Palette,
  History,
  Trash2,
  Upload,
  Globe,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { API_BASE_URL } from '../lib/constants'
import { scrapeUrl } from '../api/client'
import { ChatMessageBubble } from './ChatMessageBubble'
import { ChatInputArea } from './ChatInputArea'

const CHAT_HISTORY_KEY = 'marp-ai-chat-history'
const MAX_HISTORY_ITEMS = 50

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: Date
  parsedOutline?: ParsedOutline | null
  hasSlides?: boolean
}

interface ParsedOutline {
  title: string
  slides: Array<{
    title: string
    points: string[]
  }>
}

interface ContextItem {
  type: 'file' | 'link' | 'text'
  name: string
  content: string
}

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  currentSlide?: string
  currentSlideIndex?: number
  totalSlides?: number
  selectedText?: string
  presentationTitle?: string
  onApplyToCurrentSlide?: (content: string) => void
  onCreateNewPresentation?: (content: string, title: string) => void
  onInsertSlide?: (content: string, afterIndex: number) => void
  onOutlineGenerated?: (outline: unknown) => void
  onCreateTheme?: (colors: string[], name: string, description: string) => void
}

// Parse outline from AI response
function parseOutline(content: string): ParsedOutline | null {
  const lines = content.split('\n')
  let title = 'Presentation'
  const slides: Array<{ title: string; points: string[] }> = []
  let currentSlide: { title: string; points: string[] } | null = null

  for (const line of lines) {
    const titleMatch = line.match(/^#\s+(.+)/) || line.match(/^title[:\s]+(.+)/i)
    if (titleMatch && !currentSlide) {
      title = titleMatch[1].trim()
      continue
    }

    const slideMatch = line.match(/^(?:##\s+|(\d+)\.\s+)(.+)/)
    if (slideMatch) {
      if (currentSlide) slides.push(currentSlide)
      currentSlide = { title: slideMatch[2].trim(), points: [] }
      continue
    }

    if (currentSlide && line.match(/^\s*[-•*]\s+(.+)/)) {
      const point = line.replace(/^\s*[-•*]\s+/, '').trim()
      if (point) currentSlide.points.push(point)
    }
  }

  if (currentSlide) slides.push(currentSlide)
  return slides.length > 0 ? { title, slides } : null
}

// Extract all markdown code blocks
function extractAllMarkdown(content: string): string {
  const codeBlockRegex = /```(?:markdown|md|marp)?\n([\s\S]*?)```/g
  const blocks: string[] = []
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push(match[1].trim())
  }

  return blocks.join('\n\n---\n\n')
}

// Check if content has slide separators
function hasSlides(content: string): boolean {
  return content.includes('---') || content.includes('```')
}

// Load chat history from localStorage
function loadChatHistory(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return parsed.map((m: ChatMessage) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }))
  } catch {
    return []
  }
}

// Save chat history to localStorage
function saveChatHistory(messages: ChatMessage[]) {
  const toSave = messages.slice(-MAX_HISTORY_ITEMS)
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(toSave))
}

export function AIChatPanel({
  isOpen,
  onClose,
  currentSlide,
  currentSlideIndex = 0,
  totalSlides = 0,
  selectedText,
  presentationTitle,
  onApplyToCurrentSlide,
  onCreateNewPresentation,
  onInsertSlide,
  onOutlineGenerated,
  onCreateTheme,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory())
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [thinkingContent, setThinkingContent] = useState('')
  const [showThinking, setShowThinking] = useState<Record<string, boolean>>({})
  const [contextItems, setContextItems] = useState<ContextItem[]>([])
  const [mode, setMode] = useState<'general' | 'outline' | 'slide' | 'refine' | 'theme'>('general')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages)
    }
  }, [messages])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])


  const [isDragging, setIsDragging] = useState(false)
  const [isScrapingUrl, setIsScrapingUrl] = useState(false)

  const handleFileUploadFromInput = async (files: FileList) => {
    await processFiles(Array.from(files))
  }

  const processFiles = async (files: File[]) => {
    for (const file of files) {
      const text = await file.text()
      setContextItems(prev => [...prev, {
        type: 'file',
        name: file.name,
        content: text.slice(0, 10000)
      }])
    }
  }

  // Drag and drop handlers for context files
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const textData = e.dataTransfer.getData('text/plain')
    const uriList = e.dataTransfer.getData('text/uri-list')

    // Handle dropped files
    if (files.length > 0) {
      await processFiles(files)
      return
    }

    // Handle dropped URLs
    if (uriList || (textData && textData.startsWith('http'))) {
      const url = uriList || textData
      await handleScrapeUrl(url)
      return
    }

    // Handle dropped text
    if (textData) {
      setContextItems(prev => [...prev, {
        type: 'text',
        name: `Dropped text (${textData.slice(0, 20)}...)`,
        content: textData.slice(0, 10000)
      }])
    }
  }

  const handleScrapeUrl = async (url: string) => {
    setIsScrapingUrl(true)
    try {
      const result = await scrapeUrl(url)
      if (result.success && result.content) {
        setContextItems(prev => [...prev, {
          type: 'link',
          name: result.title || url,
          content: `URL: ${url}\n\nTitle: ${result.title || 'N/A'}\n\nDescription: ${result.description || 'N/A'}\n\nContent:\n${result.content}`
        }])
      } else {
        // Fallback to simple link reference
        setContextItems(prev => [...prev, {
          type: 'link',
          name: url,
          content: `[Link: ${url}] - Could not fetch content: ${result.error || 'Unknown error'}`
        }])
      }
    } catch (error) {
      console.error('URL scraping failed:', error)
      setContextItems(prev => [...prev, {
        type: 'link',
        name: url,
        content: `[Link: ${url}]`
      }])
    } finally {
      setIsScrapingUrl(false)
    }
  }

  const handleAddLink = async () => {
    const url = prompt('Enter URL to fetch content from:')
    if (url) {
      await handleScrapeUrl(url)
    }
  }

  const handleAddText = () => {
    const text = prompt('Enter additional context:')
    if (text) {
      setContextItems(prev => [...prev, {
        type: 'text',
        name: 'Additional context',
        content: text
      }])
    }
  }

  const removeContextItem = (index: number) => {
    setContextItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleCopy = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const clearHistory = () => {
    if (confirm('Clear all chat history?')) {
      setMessages([])
      localStorage.removeItem(CHAT_HISTORY_KEY)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setStreamingContent('')
    setThinkingContent('')

    try {
      const contextStr = contextItems.map(c => c.content).join('\n\n')

      // Add current slide context for slide/refine modes
      let slideContext = ''
      if ((mode === 'slide' || mode === 'refine') && currentSlide) {
        slideContext = `Current slide (${currentSlideIndex + 1}/${totalSlides}):\n${currentSlide}`
      }
      if (selectedText) {
        slideContext += `\n\nSelected text: "${selectedText}"`
      }

      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          context: [contextStr, slideContext].filter(Boolean).join('\n\n') || null,
          mode,
          current_slide: currentSlide || null,
        })
      })

      if (!response.ok) throw new Error('Stream failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let thinkingText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('event: ')) continue
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.delta) {
                  fullContent += data.delta
                  setStreamingContent(fullContent)
                }
                if (data.message === 'Processing...') {
                  thinkingText = 'Analyzing your request...'
                  setThinkingContent(thinkingText)
                }
                if (data.outline && onOutlineGenerated) {
                  onOutlineGenerated(data.outline)
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Parse outline if in outline mode
      const parsedOutline = mode === 'outline' ? parseOutline(fullContent) : null

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullContent,
        thinking: thinkingText,
        timestamp: new Date(),
        parsedOutline,
        hasSlides: hasSlides(fullContent)
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      setThinkingContent('')
    }
  }

  const handleApplyToSlide = (content: string) => {
    const markdown = extractAllMarkdown(content)
    if (markdown && onApplyToCurrentSlide) {
      onApplyToCurrentSlide(markdown)
    }
  }

  const handleCreatePresentation = (content: string) => {
    const markdown = extractAllMarkdown(content)
    if (markdown && onCreateNewPresentation) {
      // Extract title from first heading
      const titleMatch = markdown.match(/^#\s+(.+)/m)
      const title = titleMatch ? titleMatch[1] : 'New Presentation'
      onCreateNewPresentation(markdown, title)
    }
  }

  const handleInsertAsNewSlide = (content: string) => {
    const markdown = extractAllMarkdown(content)
    if (markdown && onInsertSlide) {
      onInsertSlide(markdown, currentSlideIndex)
    }
  }

  const handleCreateThemeFromChat = (content: string) => {
    // Extract colors from content
    const colorRegex = /#[0-9A-Fa-f]{6}/g
    const colors = content.match(colorRegex) || ['#3B82F6', '#8B5CF6']
    const uniqueColors = [...new Set(colors)].slice(0, 10)

    // Extract theme name
    const nameMatch = content.match(/theme[:\s]+["']?([^"'\n]+)["']?/i)
    const name = nameMatch ? nameMatch[1] : 'AI Generated Theme'

    if (onCreateTheme) {
      onCreateTheme(uniqueColors, name, content)
    }
  }

  const toggleThinking = (id: string) => {
    setShowThinking(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Context-aware quick actions based on mode and current state
  const getQuickActions = () => {
    const slideInfo = currentSlide
      ? `Current slide ${currentSlideIndex + 1}/${totalSlides}`
      : 'No slide selected'

    if (mode === 'outline') {
      return [
        { emoji: '📝', label: 'Create outline', action: () => setInput('Create an outline for a presentation about ') },
        { emoji: '🎯', label: 'Expand topic', action: () => setInput('Expand this topic into a detailed outline: ') },
      ]
    }

    if (mode === 'slide') {
      return [
        { emoji: '✨', label: `Improve ${slideInfo}`, action: () => setInput('Improve this slide - make it more engaging') },
        { emoji: '📊', label: 'Add visuals', action: () => setInput('Suggest visual elements or diagrams for this slide') },
        { emoji: '➕', label: 'Generate new slide', action: () => setInput('Generate a new slide about ') },
      ]
    }

    if (mode === 'refine') {
      return [
        { emoji: '🎯', label: selectedText ? 'Simplify selection' : 'Simplify slide', action: () => setInput(selectedText ? `Simplify this text: "${selectedText}"` : 'Simplify this slide for beginners') },
        { emoji: '📚', label: 'Expand content', action: () => setInput('Expand this content with more details') },
        { emoji: '✍️', label: 'Rewrite', action: () => setInput('Rewrite this content to be more ') },
      ]
    }

    if (mode === 'theme') {
      return [
        { emoji: '🎨', label: 'Corporate theme', action: () => setInput('Create a professional corporate theme with blue and gray colors') },
        { emoji: '🌈', label: 'Colorful theme', action: () => setInput('Create a vibrant, colorful theme for creative presentations') },
        { emoji: '🌙', label: 'Dark theme', action: () => setInput('Create a modern dark theme with subtle accent colors') },
      ]
    }

    // General mode
    return [
      { emoji: '📝', label: 'Create outline', action: () => setInput('Create an outline for a presentation about ') },
      { emoji: '✨', label: 'Improve current slide', action: () => setInput('Improve this slide - make it clearer and more engaging') },
      { emoji: '📊', label: 'Generate slide', action: () => setInput('Generate a slide about ') },
      { emoji: '🎨', label: 'Create theme', action: () => { setMode('theme'); setInput('Create a theme for ') } },
    ]
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed right-0 top-0 h-full w-[440px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-50",
          isDragging && "ring-2 ring-primary-500 ring-inset"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-primary-600 to-primary-700">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">AI Assistant</h2>
              <p className="text-xs text-white/70">
                {presentationTitle ? `Working on: ${presentationTitle}` : 'Chat-based generation'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className="text-white hover:bg-white/20"
              title="Chat history"
            >
              <History className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex gap-1 flex-wrap">
            {[
              { id: 'general', label: 'Chat', icon: MessageSquare },
              { id: 'outline', label: 'Outline', icon: FileText },
              { id: 'slide', label: 'Slide', icon: Sparkles },
              { id: 'refine', label: 'Refine', icon: Lightbulb },
              { id: 'theme', label: 'Theme', icon: Palette },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id as typeof mode)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  mode === id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          {/* Current context indicator */}
          {(mode === 'slide' || mode === 'refine') && (
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {currentSlide ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Slide {currentSlideIndex + 1}/{totalSlides}
                  {selectedText && <span className="text-primary-600"> • Text selected</span>}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  No slide selected - select one in the editor
                </span>
              )}
            </div>
          )}
        </div>

        {/* Context Items */}
        {contextItems.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <p className="text-xs font-medium text-slate-500 mb-2">Context</p>
            <div className="flex flex-wrap gap-1.5">
              {contextItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary-100 dark:bg-primary-900/30 text-xs"
                >
                  {item.type === 'file' && <FileText className="w-3 h-3 text-primary-600" />}
                  {item.type === 'link' && <LinkIcon className="w-3 h-3 text-primary-600" />}
                  {item.type === 'text' && <MessageSquare className="w-3 h-3 text-primary-600" />}
                  <span className="text-primary-800 dark:text-primary-300 max-w-[100px] truncate">
                    {item.name}
                  </span>
                  <button onClick={() => removeContextItem(i)} className="text-primary-600 hover:text-primary-800">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Chat History ({messages.length})</p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-xs text-red-600 hover:text-red-700 h-6 px-2"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                  className="text-xs h-6 px-2"
                >
                  Close
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              History is saved locally. {MAX_HISTORY_ITEMS} messages max.
            </p>
          </div>
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary-500/10 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-2xl border-2 border-dashed border-primary-500 text-center">
              <Upload className="w-12 h-12 text-primary-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">Drop files here</p>
              <p className="text-sm text-slate-500">Supports text files, markdown, and URLs</p>
            </div>
          </div>
        )}

        {/* URL scraping indicator */}
        {isScrapingUrl && (
          <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/30 border-b border-primary-100 dark:border-primary-800 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary-600 animate-pulse" />
            <span className="text-sm text-primary-700 dark:text-primary-300">Fetching URL content...</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-4 shadow-lg">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                AI Presentation Assistant
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {mode === 'theme' ? 'Describe the theme you want to create.' :
                 mode === 'slide' ? 'I\'ll help improve or generate slides.' :
                 mode === 'refine' ? 'I\'ll help refine your content.' :
                 mode === 'outline' ? 'Describe your presentation topic.' :
                 'Ask me anything about presentations!'}
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {getQuickActions().map(({ emoji, label, action }, i) => (
                  <button
                    key={i}
                    onClick={action}
                    className="text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              showThinking={showThinking[message.id] || false}
              copiedId={copiedId}
              mode={mode}
              onToggleThinking={toggleThinking}
              onCopy={handleCopy}
              onApplyToSlide={onApplyToCurrentSlide ? handleApplyToSlide : undefined}
              onInsertSlide={onInsertSlide ? handleInsertAsNewSlide : undefined}
              onCreatePresentation={onCreateNewPresentation ? handleCreatePresentation : undefined}
              onCreateTheme={onCreateTheme ? handleCreateThemeFromChat : undefined}
            />
          ))}

          {/* Streaming message */}
          {isStreaming && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 max-w-[85%] rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3">
                {thinkingContent && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {thinkingContent}
                  </div>
                )}
                {streamingContent ? (
                  <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-4 bg-primary-500 ml-0.5 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <ChatInputArea
          input={input}
          isStreaming={isStreaming}
          isScrapingUrl={isScrapingUrl}
          mode={mode}
          onInputChange={setInput}
          onSend={handleSend}
          onFileUpload={handleFileUploadFromInput}
          onAddLink={handleAddLink}
          onAddText={handleAddText}
        />
      </motion.div>
    </AnimatePresence>
  )
}
