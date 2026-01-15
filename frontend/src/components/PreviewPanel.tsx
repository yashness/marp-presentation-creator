import { LoadingSpinner } from './LoadingSpinner'
import { Eye } from 'lucide-react'

interface PreviewPanelProps {
  preview: string
  selectedId: string | null
  previewLoading: boolean
}

export function PreviewPanel({ preview, selectedId, previewLoading }: PreviewPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-lg p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 grid place-items-center border border-primary-300 shadow-sm">
          <Eye className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Preview</h2>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-inner p-8 max-w-6xl mx-auto min-h-full">
          {previewLoading ? (
            <LoadingSpinner />
          ) : selectedId && preview ? (
            <div
              className="preview-content space-y-6"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select or start a presentation to see the live preview
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
