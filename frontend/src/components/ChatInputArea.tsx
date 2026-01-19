import { useRef } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Paperclip, Link as LinkIcon, FileText, Send, Loader2 } from 'lucide-react'

interface ChatInputAreaProps {
  input: string
  isStreaming: boolean
  isScrapingUrl: boolean
  mode: 'general' | 'outline' | 'slide' | 'refine' | 'theme'
  onInputChange: (value: string) => void
  onSend: () => void
  onFileUpload: (files: FileList) => void
  onAddLink: () => void
  onAddText: () => void
}

export function ChatInputArea({
  input,
  isStreaming,
  isScrapingUrl,
  mode,
  onInputChange,
  onSend,
  onFileUpload,
  onAddLink,
  onAddText,
}: ChatInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFileUpload(e.target.files)
      e.target.value = ''
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const getPlaceholder = () => {
    switch (mode) {
      case 'theme':
        return 'Describe your theme (colors, style, mood)...'
      case 'slide':
        return 'Describe what you want for this slide...'
      case 'refine':
        return 'How should I refine this content?'
      case 'outline':
        return 'Describe your presentation topic...'
      default:
        return 'Ask about presentations, generate content...'
    }
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2 mb-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.json,.csv,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Paperclip className="w-3.5 h-3.5" />
          File
        </button>
        <button
          onClick={onAddLink}
          disabled={isScrapingUrl}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {isScrapingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
          Link
        </button>
        <button
          onClick={onAddText}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Text
        </button>
      </div>

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          className="min-h-[80px] max-h-[160px] pr-12 resize-none"
          disabled={isStreaming}
        />
        <Button
          onClick={onSend}
          disabled={!input.trim() || isStreaming}
          size="icon"
          className="absolute bottom-2 right-2 h-8 w-8 rounded-lg"
        >
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      <p className="text-xs text-slate-400 mt-2 text-center">
        Enter to send • Shift+Enter for new line
      </p>
    </div>
  )
}
