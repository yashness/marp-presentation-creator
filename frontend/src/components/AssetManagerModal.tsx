import { useCallback } from 'react'
import { Button } from './ui/button'
import { Modal, ModalContent } from './ui/animated-modal'
import { FileUpload } from './ui/file-upload'
import { Trash2, Copy, Image as ImageIcon, Loader2 } from 'lucide-react'
import { IconPhoto } from '@tabler/icons-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/constants'
import { motion, AnimatePresence } from 'motion/react'

interface Asset {
  id: string
  filename: string
  original_filename: string
  content_type: string
  size_bytes: number
  url: string
  created_at: string
}

interface AssetManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AssetManagerModal({ isOpen, onClose }: AssetManagerModalProps) {
  const queryClient = useQueryClient()

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/assets`)
      if (!res.ok) throw new Error('Failed to fetch assets')
      return res.json()
    },
    enabled: isOpen
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_BASE_URL}/api/assets`, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Failed to upload asset')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const res = await fetch(`${API_BASE_URL}/api/assets/${assetId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete asset')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    }
  })

  const handleFileUpload = useCallback((files: File[]) => {
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        uploadMutation.mutate(file)
      }
    })
  }, [uploadMutation])

  const copyToClipboard = async (url: string) => {
    const fullUrl = `${API_BASE_URL}${url}`
    await navigator.clipboard.writeText(`![image](${fullUrl})`)
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <Modal>
        <ModalBodyWrapper onClose={onClose}>
          <ModalContent className="p-0">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b border-secondary-200 dark:border-secondary-800">
              <div className="p-2 rounded-lg bg-primary-700 text-white">
                <IconPhoto className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Asset Manager</h2>
                <p className="text-sm text-slate-500">Upload and manage your images</p>
              </div>
            </div>

            {/* Upload Area */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <FileUpload onChange={handleFileUpload} />
              {uploadMutation.isPending && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-primary-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </div>
              )}
            </div>

            {/* Assets Grid */}
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">No assets uploaded yet</p>
                  <p className="text-slate-400 text-sm">Upload images to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {assets.map((asset, idx) => (
                      <motion.div
                        key={asset.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 hover:shadow-xl transition-all duration-300"
                      >
                        <div className="aspect-square bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                          {asset.content_type.startsWith('image/') ? (
                            <img
                              src={`${API_BASE_URL}${asset.url}`}
                              alt={asset.original_filename}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <ImageIcon className="w-12 h-12 text-slate-400" />
                          )}
                        </div>

                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                          <p className="text-white text-sm font-medium truncate mb-1">
                            {asset.original_filename}
                          </p>
                          <p className="text-white/70 text-xs mb-2">
                            {formatFileSize(asset.size_bytes)}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                              onClick={() => copyToClipboard(asset.url)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-red-500/80 hover:bg-red-500 text-white border-0"
                              onClick={() => deleteMutation.mutate(asset.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </ModalContent>
        </ModalBodyWrapper>
      </Modal>
    </div>
  )
}

// Wrapper to control modal state externally
function ModalBodyWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-4xl mx-4 bg-white dark:bg-slate-950 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  )
}
