import Editor from '@monaco-editor/react'
import type { Theme } from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { ExportButton } from './ExportButton'
import { Eye, Loader2 } from 'lucide-react'

interface EditorPanelProps {
  title: string
  content: string
  selectedTheme: string | null
  selectedId: string | null
  loading: boolean
  previewLoading: boolean
  themes: Theme[]
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onThemeChange: (theme: string) => void
  onCreate: () => void
  onUpdate: () => void
  onExport: (format: 'pdf' | 'html' | 'pptx') => void
  onPreview: () => void
}

interface SaveButtonProps {
  selectedId: string | null
  loading: boolean
  onCreate: () => void
  onUpdate: () => void
}

function SaveButton({ selectedId, loading, onCreate, onUpdate }: SaveButtonProps) {
  if (selectedId) {
    return (
      <Button onClick={onUpdate} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
      </Button>
    )
  }
  return (
    <Button onClick={onCreate} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
    </Button>
  )
}

interface PreviewButtonProps {
  selectedId: string | null
  previewLoading: boolean
  onPreview: () => void
}

function PreviewButton({ selectedId, previewLoading, onPreview }: PreviewButtonProps) {
  return (
    <Button onClick={onPreview} variant="outline" disabled={!selectedId || previewLoading}>
      {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
      Preview
    </Button>
  )
}

interface ExportButtonGroupProps {
  selectedId: string | null
  onExport: (format: 'pdf' | 'html' | 'pptx') => void
}

function ExportButtonGroup({ selectedId, onExport }: ExportButtonGroupProps) {
  return (
    <>
      <ExportButton format="pdf" onClick={onExport} disabled={!selectedId} />
      <ExportButton format="html" onClick={onExport} disabled={!selectedId} />
      <ExportButton format="pptx" onClick={onExport} disabled={!selectedId} />
    </>
  )
}

export function EditorPanel({
  title,
  content,
  selectedTheme,
  selectedId,
  loading,
  previewLoading,
  themes,
  onTitleChange,
  onContentChange,
  onThemeChange,
  onCreate,
  onUpdate,
  onExport,
  onPreview,
}: EditorPanelProps) {
  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-6">
          Marp Presentation Builder
        </h1>

        <div className="flex gap-4 mb-4">
          <Input
            type="text"
            placeholder="Presentation Title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="flex-1"
          />
          <Select value={selectedTheme || ''} onChange={(e) => onThemeChange(e.target.value)}>
            <option value="">Default Theme</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex gap-2">
          <SaveButton selectedId={selectedId} loading={loading} onCreate={onCreate} onUpdate={onUpdate} />
          <PreviewButton selectedId={selectedId} previewLoading={previewLoading} onPreview={onPreview} />
          <ExportButtonGroup selectedId={selectedId} onExport={onExport} />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-lg border border-primary-200 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={content}
          onChange={(value) => onContentChange(value || '')}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  )
}
