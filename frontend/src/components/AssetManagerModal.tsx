import { useState, useCallback } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Upload, Trash2, Copy, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Asset {
  id: string
  filename: string
  original_filename: string
  content_type: string
  size: number
  url: string
  created_at: string
}

interface AssetManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AssetManagerModal({ isOpen, onClose }: AssetManagerModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/api/assets')
      if (!res.ok) throw new Error('Failed to fetch assets')
      return res.json()
    },
    enabled: isOpen
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      setUploadProgress(0)
      const res = await fetch('http://localhost:8000/api/assets', {
        method: 'POST',
        body: formData
      })
      setUploadProgress(null)

      if (!res.ok) throw new Error('Failed to upload asset')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const res = await fetch(`http://localhost:8000/api/assets/${assetId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete asset')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    }
  })

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        uploadMutation.mutate(file)
      }
    })
  }, [uploadMutation])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => uploadMutation.mutate(file))
  }, [uploadMutation])

  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(`![image](${url})`)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary-700 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-primary-600" />
            Asset Manager
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">Drag and drop images here or</p>
            <label htmlFor="file-upload" className="inline-block">
              <Button type="button" variant="outline" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            {uploadProgress !== null && (
              <div className="mt-4">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No assets uploaded yet. Upload images to get started.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                    {asset.content_type.startsWith('image/') ? (
                      <img
                        src={asset.url}
                        alt={asset.original_filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-sm font-medium truncate" title={asset.original_filename}>
                      {asset.original_filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(asset.size)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => copyToClipboard(asset.url)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(asset.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
