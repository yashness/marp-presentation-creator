import { useCallback, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import type { SlideOperation } from '../api/client'
import { Button } from './ui/button'
import { LayoutPicker } from './LayoutPicker'
import { SlideActionsMenu } from './SlideActionsMenu'
import { SlideImageButton } from './SlideImageButton'
import { SlideRewriteModal } from './SlideRewriteModal'
import { CommentGeneratorModal } from './CommentGeneratorModal'
import { SelectionRewriteModal } from './SelectionRewriteModal'
import { TTSButton } from './TTSButton'
import { AnimatePresence, motion } from 'motion/react'
import { MessageSquarePlus, Plus, RefreshCw, Trash2, Wand2 } from 'lucide-react'
import type { SlideBlock } from '../lib/markdown'

interface SlideBlockEditorProps {
  slide: SlideBlock
  index: number
  isFirst: boolean
  isActive: boolean
  canDelete: boolean
  presentationId: string | null
  isCommentOpen: boolean
  rewriteLoading: boolean
  rewriteCommentLoading: boolean
  slideOperationLoading: string | null
  onSlideChange: (index: number, value: string) => void
  onCommentChange: (index: number, value: string) => void
  onInsertSlide: (afterIndex: number) => void
  onDeleteSlide: (index: number) => void
  onDuplicateSlide: (index: number) => void
  onToggleComment: (id: string) => void
  onAIRewrite: (index: number, instruction: string, length: 'short' | 'medium' | 'long') => Promise<void>
  onQuickRewrite: (index: number, instruction: string) => Promise<void>
  onAIRewriteComment: (index: number, style: string) => Promise<void>
  onSlideOperation: (index: number, operation: SlideOperation, style?: string) => Promise<void>
  onRewriteSelectedText: (index: number, text: string, instruction: string, start: number, end: number) => Promise<void>
}

export function SlideBlockEditor({
  slide,
  index,
  isFirst,
  isActive,
  canDelete,
  presentationId,
  isCommentOpen,
  rewriteLoading,
  rewriteCommentLoading,
  slideOperationLoading,
  onSlideChange,
  onCommentChange,
  onInsertSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onToggleComment,
  onAIRewrite,
  onQuickRewrite,
  onAIRewriteComment,
  onSlideOperation,
  onRewriteSelectedText,
}: SlideBlockEditorProps) {
  const [rewriteOpen, setRewriteOpen] = useState(false)
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false)
  const [selectedText, setSelectedText] = useState<{ text: string; start: number; end: number } | null>(null)
  const [selectionRewriteOpen, setSelectionRewriteOpen] = useState(false)
  const [selectionRewriteLoading, setSelectionRewriteLoading] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount = useCallback((editorInstance: editor.IStandaloneCodeEditor) => {
    editorRef.current = editorInstance
    editorInstance.onDidChangeCursorSelection(() => {
      const selection = editorInstance.getSelection()
      if (selection && !selection.isEmpty()) {
        const model = editorInstance.getModel()
        if (model) {
          const text = model.getValueInRange(selection)
          const startOffset = model.getOffsetAt(selection.getStartPosition())
          const endOffset = model.getOffsetAt(selection.getEndPosition())
          if (text.trim()) {
            setSelectedText({ text, start: startOffset, end: endOffset })
          }
        }
      } else {
        setTimeout(() => {
          const currentSelection = editorInstance.getSelection()
          if (!currentSelection || currentSelection.isEmpty()) {
            setSelectedText(null)
          }
        }, 200)
      }
    })
  }, [])

  const handleRewriteSelectedText = useCallback(async (instruction: string) => {
    if (!selectedText) return
    setSelectionRewriteLoading(true)
    try {
      await onRewriteSelectedText(index, selectedText.text, instruction, selectedText.start, selectedText.end)
      setSelectionRewriteOpen(false)
      setSelectedText(null)
    } finally {
      setSelectionRewriteLoading(false)
    }
  }, [selectedText, index, onRewriteSelectedText])

  const handleApplyLayout = useCallback((newContent: string) => {
    onSlideChange(index, newContent)
    setLayoutPickerOpen(false)
  }, [index, onSlideChange])

  return (
    <div>
      {isFirst && (
        <div className="flex items-center justify-center py-1 group">
          <button
            onClick={() => onInsertSlide(-1)}
            className="flex items-center gap-1 px-3 py-1 text-xs text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
          >
            <Plus className="w-3 h-3" />
            <span>Insert slide above</span>
          </button>
        </div>
      )}
      <div className={`p-4 space-y-3 ${isActive ? 'bg-primary-50/40' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary-700">Slide {index + 1}</span>
            <span className="text-[11px] text-slate-500">ID: {slide.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRewriteOpen(!rewriteOpen)}
                className="text-xs gap-1 text-primary-700 border-primary-200 hover:bg-primary-50 hover:border-primary-300"
              >
                <Wand2 className="w-3.5 h-3.5" />
                AI Rewrite
              </Button>
              <SlideRewriteModal
                isOpen={rewriteOpen}
                onClose={() => setRewriteOpen(false)}
                onRewrite={async (instruction, length) => {
                  await onAIRewrite(index, instruction, length)
                  setRewriteOpen(false)
                }}
                onQuickRewrite={(instruction) => onQuickRewrite(index, instruction)}
                isLoading={rewriteLoading}
              />
            </div>
            <SlideImageButton
              slideContent={slide.content}
              onImageInsert={(markdown) => onSlideChange(index, slide.content + '\n\n' + markdown)}
            />
            <div className="relative">
              <SlideActionsMenu
                onLayoutClick={() => setLayoutPickerOpen(!layoutPickerOpen)}
                onOperation={(op) => onSlideOperation(index, op)}
                onDuplicate={() => onDuplicateSlide(index)}
                loadingOperation={slideOperationLoading}
              />
              {layoutPickerOpen && (
                <LayoutPicker
                  isOpen={true}
                  onClose={() => setLayoutPickerOpen(false)}
                  slideContent={slide.content}
                  onApplyLayout={handleApplyLayout}
                />
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleComment(slide.id)}
              className="text-xs"
            >
              {isCommentOpen ? 'Hide comments' : 'Add comment'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeleteSlide(index)}
              disabled={!canDelete}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isCommentOpen && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary-100 text-primary-600 grid place-items-center">
                  <MessageSquarePlus className="w-4 h-4" />
                </div>
                <label className="text-sm font-semibold text-primary-800">Slide comment</label>
              </div>
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCommentModalOpen(!commentModalOpen)}
                  className="text-xs gap-1 text-primary-600 border-primary-200 hover:bg-primary-50 hover:border-primary-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  AI Generate
                </Button>
                <CommentGeneratorModal
                  isOpen={commentModalOpen}
                  onClose={() => setCommentModalOpen(false)}
                  onGenerate={async (style) => {
                    await onAIRewriteComment(index, style)
                    setCommentModalOpen(false)
                  }}
                  isLoading={rewriteCommentLoading}
                />
              </div>
            </div>
            <textarea
              className="w-full border-2 border-primary-200 rounded-lg p-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:border-primary-400"
              rows={3}
              value={slide.comment}
              onChange={(e) => onCommentChange(index, e.target.value)}
              placeholder="Add presenter notes or audio prompt"
            />
            <div className="pt-3">
              <TTSButton presentationId={presentationId} slideIndex={index} commentText={slide.comment || ''} />
            </div>
          </div>
        )}

        <div className="relative rounded-md border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 px-4">
          <AnimatePresence>
            {selectedText && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-2 right-4 z-20"
              >
                <Button
                  size="sm"
                  onClick={() => setSelectionRewriteOpen(true)}
                  className="gap-1.5 bg-secondary-600 hover:bg-secondary-700 text-white shadow-lg"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Rewrite Selection
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedText && (
            <SelectionRewriteModal
              isOpen={selectionRewriteOpen}
              selectedText={selectedText.text}
              onClose={() => {
                setSelectionRewriteOpen(false)
              }}
              onRewrite={handleRewriteSelectedText}
              isLoading={selectionRewriteLoading}
            />
          )}

          <Editor
            height="180px"
            defaultLanguage="markdown"
            value={slide.content}
            onChange={(value) => onSlideChange(index, value || '')}
            onMount={handleEditorDidMount}
            theme="vs-light"
            path={`slide-${slide.id}.md`}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'off',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              overviewRulerLanes: 0,
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 0,
              renderLineHighlight: 'none',
              renderWhitespace: 'none',
              contextmenu: false,
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
              parameterHints: { enabled: false },
              lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.Off },
              codeLens: false,
              formatOnType: false,
              formatOnPaste: false,
              scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
              padding: { top: 16, bottom: 16 },
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-center py-2 group relative">
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
        <button
          onClick={() => onInsertSlide(index)}
          className="relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-slate-400 bg-white border border-transparent hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Insert slide</span>
        </button>
      </div>
    </div>
  )
}
