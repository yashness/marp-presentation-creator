import { LoadingSpinner } from './LoadingSpinner'
import { Eye } from 'lucide-react'

interface PreviewPanelProps {
  preview: string
  selectedId: string | null
  previewLoading: boolean
}

export function PreviewPanel({ preview, selectedId, previewLoading }: PreviewPanelProps) {
  return (
    <div className="w-1/2 p-6 overflow-hidden flex flex-col bg-gradient-to-bl from-white/50 to-secondary-50/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-secondary-500 to-primary-500 rounded-lg shadow-md">
          <Eye className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-secondary-700 to-primary-600 bg-clip-text text-transparent">Live Preview</h2>
      </div>
      <div className="flex-1 overflow-auto bg-white/70 backdrop-blur-sm rounded-xl border border-secondary-200/50 shadow-lg p-6">
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
  )
}
