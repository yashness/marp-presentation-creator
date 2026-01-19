import { motion } from 'motion/react'
import { Bot, User, Lightbulb, ChevronUp, ChevronDown, Copy, Check, RotateCcw, Plus, Sparkles, Palette } from 'lucide-react'
import { cn } from '../lib/utils'

interface ParsedOutline {
  title: string
  slides: Array<{
    title: string
    points: string[]
  }>
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: Date
  parsedOutline?: ParsedOutline | null
  hasSlides?: boolean
}

interface ChatMessageBubbleProps {
  message: ChatMessage
  showThinking: boolean
  copiedId: string | null
  mode: 'general' | 'outline' | 'slide' | 'refine' | 'theme'
  onToggleThinking: (id: string) => void
  onCopy: (id: string, content: string) => void
  onApplyToSlide?: (content: string) => void
  onInsertSlide?: (content: string) => void
  onCreatePresentation?: (content: string) => void
  onCreateTheme?: (content: string) => void
}

export function ChatMessageBubble({
  message,
  showThinking,
  copiedId,
  mode,
  onToggleThinking,
  onCopy,
  onApplyToSlide,
  onInsertSlide,
  onCreatePresentation,
  onCreateTheme,
}: ChatMessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : '')}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        message.role === 'user'
          ? 'bg-primary-600 text-white'
          : 'bg-gradient-to-br from-primary-500 to-primary-700 text-white'
      )}>
        {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className={cn(
        'flex-1 max-w-[85%] rounded-xl px-4 py-3',
        message.role === 'user'
          ? 'bg-primary-600 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
      )}>
        {/* Thinking indicator */}
        {message.thinking && (
          <button
            onClick={() => onToggleThinking(message.id)}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <Lightbulb className="w-3 h-3" />
            <span>Reasoning</span>
            {showThinking ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {showThinking && message.thinking && (
          <div className="mb-3 p-2 rounded-lg bg-slate-200/50 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-400 italic">
            {message.thinking}
          </div>
        )}

        {/* Parsed outline display */}
        {message.parsedOutline && (
          <div className="mb-3 p-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
            <h4 className="font-semibold text-sm mb-2">{message.parsedOutline.title}</h4>
            <div className="space-y-2">
              {message.parsedOutline.slides.map((slide, i) => (
                <div key={i} className="text-xs">
                  <div className="font-medium text-primary-600 dark:text-primary-400">
                    {i + 1}. {slide.title}
                  </div>
                  {slide.points.length > 0 && (
                    <ul className="ml-4 mt-1 text-slate-500 dark:text-slate-400 space-y-0.5">
                      {slide.points.slice(0, 3).map((point, j) => (
                        <li key={j}>• {point}</li>
                      ))}
                      {slide.points.length > 3 && (
                        <li className="text-slate-400">+{slide.points.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular content */}
        {!message.parsedOutline && (
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}

        {/* Actions for assistant messages */}
        {message.role === 'assistant' && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onCopy(message.id, message.content)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              {copiedId === message.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copiedId === message.id ? 'Copied!' : 'Copy'}
            </button>

            {message.hasSlides && onApplyToSlide && (
              <button
                onClick={() => onApplyToSlide(message.content)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <RotateCcw className="w-3 h-3" />
                Replace slide
              </button>
            )}

            {message.hasSlides && onInsertSlide && (
              <button
                onClick={() => onInsertSlide(message.content)}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 dark:text-green-400"
              >
                <Plus className="w-3 h-3" />
                Insert slide
              </button>
            )}

            {message.hasSlides && onCreatePresentation && (
              <button
                onClick={() => onCreatePresentation(message.content)}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                <Sparkles className="w-3 h-3" />
                New presentation
              </button>
            )}

            {mode === 'theme' && onCreateTheme && (
              <button
                onClick={() => onCreateTheme(message.content)}
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400"
              >
                <Palette className="w-3 h-3" />
                Create theme
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
