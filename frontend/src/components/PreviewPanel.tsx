interface PreviewPanelProps {
  preview: string
  selectedId: string | null
}

export function PreviewPanel({ preview, selectedId }: PreviewPanelProps) {
  return (
    <div className="w-1/2 p-6 overflow-hidden flex flex-col">
      <h2 className="text-2xl font-bold text-primary-900 mb-4">Preview</h2>
      <div className="flex-1 bg-white rounded-lg shadow-lg border border-primary-200 overflow-auto">
        {selectedId && preview ? (
          <div dangerouslySetInnerHTML={{ __html: preview }} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Select a presentation to preview
          </div>
        )}
      </div>
    </div>
  )
}
