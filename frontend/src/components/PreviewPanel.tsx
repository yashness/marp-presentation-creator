import { LoadingSpinner } from './LoadingSpinner'

interface PreviewPanelProps {
  preview: string
  selectedId: string | null
  previewLoading: boolean
}

export function PreviewPanel({ preview, selectedId, previewLoading }: PreviewPanelProps) {
  return (
    <div className="w-1/2 p-6 overflow-hidden flex flex-col">
      <h2 className="text-2xl font-bold text-primary-800 mb-4">Preview</h2>
      <div className="flex-1 overflow-auto">
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
