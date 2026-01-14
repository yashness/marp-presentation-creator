import Editor from '@monaco-editor/react'
import type { Theme } from '../api/client'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { ExportButton } from './ExportButton'
import { AutosaveStatusIndicator } from './AutosaveStatusIndicator'
import { Info } from 'lucide-react'

interface EditorPanelProps {
  title: string
  content: string
  selectedTheme: string | null
  selectedId: string | null
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  themes: Theme[]
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onThemeChange: (theme: string) => void
  onExport: (format: 'pdf' | 'html' | 'pptx') => void
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
  autosaveStatus,
  themes,
  onTitleChange,
  onContentChange,
  onThemeChange,
  onExport,
}: EditorPanelProps) {
  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-4xl font-bold text-primary-800">
            Marp Presentation Builder
          </h1>
          <div className="h-6 flex items-center">
            <AutosaveStatusIndicator status={autosaveStatus} />
          </div>
        </div>
        <p className="text-sm text-primary-400 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Autosaves and refreshes the preview as you type. Start typing to create a draft automatically.
        </p>

        <div className="flex gap-4 mb-3">
          <Input
            type="text"
            placeholder="Presentation Title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="flex-1 min-w-[240px]"
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
          <ExportButtonGroup selectedId={selectedId} onExport={onExport} />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
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
