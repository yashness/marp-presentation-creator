import { LoadingSpinner } from './LoadingSpinner'
import { Eye } from 'lucide-react'

interface PreviewPanelProps {
  preview: string
  selectedId: string | null
  previewLoading: boolean
}

export function PreviewPanel({ preview, selectedId, previewLoading }: PreviewPanelProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white border-x border-slate-200 p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-md bg-primary-100 text-primary-700 border border-primary-200">
          <Eye className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Live Preview</h2>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-6 max-w-5xl mx-auto">
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
