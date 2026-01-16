import { useState, useMemo } from 'react'
import type { Presentation, Folder } from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { PresentationItem } from './PresentationItem'
import { UserMenu } from './UserMenu'
import { AssetManagerModal } from './AssetManagerModal'
import { FolderTree } from './FolderTree'
import { Plus, Presentation as PresentationIcon, Sparkles, Image, ArrowUpDown } from 'lucide-react'

type SortOrder = 'newest' | 'oldest' | 'name'

interface PresentationSidebarProps {
  presentations: Presentation[]
  folders: Folder[]
  selectedId: string | null
  selectedFolderId: string | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelect: (pres: Presentation) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onNewPresentation: () => void
  onAIGenerate?: () => void
  onSelectFolder: (folderId: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onUpdateFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onMovePresentation?: (presentationId: string, folderId: string | null) => void
}

export function PresentationSidebar({
  presentations,
  folders,
  selectedId,
  selectedFolderId,
  searchQuery,
  onSearchChange,
  onSelect,
  onDelete,
  onDuplicate,
  onNewPresentation,
  onAIGenerate,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onMovePresentation,
}: PresentationSidebarProps) {
  const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const sortedPresentations = useMemo(() => {
    const filtered = selectedFolderId
      ? presentations.filter(p => p.folder_id === selectedFolderId)
      : presentations

    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        case 'oldest':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        case 'name':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })
  }, [presentations, selectedFolderId, sortOrder])

  const cycleSortOrder = () => {
    setSortOrder(current => {
      switch (current) {
        case 'newest': return 'oldest'
        case 'oldest': return 'name'
        case 'name': return 'newest'
      }
    })
  }

  const sortLabel = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    name: 'A-Z'
  }[sortOrder]

  return (
    <div className="h-full bg-white rounded-xl border border-slate-200 flex flex-col shadow-lg overflow-hidden">
      <div className="p-6 border-b border-secondary-200 space-y-3 bg-white">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <PresentationIcon className="w-5 h-5 text-primary-600" />
          </div>
          Library
        </h2>
        <Button onClick={onNewPresentation} className="w-full">
          <Plus className="w-4 h-4" />
          New Presentation
        </Button>
        {onAIGenerate && (
          <Button onClick={onAIGenerate} className="w-full" variant="secondary">
            <Sparkles className="w-4 h-4" />
            AI Generate
          </Button>
        )}
        <Button onClick={() => setIsAssetManagerOpen(true)} className="w-full" variant="outline">
          <Image className="w-4 h-4" />
          Manage Assets
        </Button>
      </div>

      <div className="p-5 border-b border-slate-200 bg-white">
        <Input
          type="text"
          placeholder="Search presentations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            onCreateFolder={onCreateFolder}
            onUpdateFolder={onUpdateFolder}
            onDeleteFolder={onDeleteFolder}
            onMovePresentation={onMovePresentation}
          />
        </div>

        <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-white">
          <span className="text-xs text-slate-500">
            {sortedPresentations.length} presentation{sortedPresentations.length !== 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleSortOrder}
            className="text-xs text-slate-500 hover:text-slate-700 h-6 px-2"
          >
            <ArrowUpDown className="w-3 h-3 mr-1" />
            {sortLabel}
          </Button>
        </div>

        <ul className="p-3 space-y-2">
          {sortedPresentations.map(p => (
            <PresentationItem
              key={p.id}
              presentation={p}
              isSelected={selectedId === p.id}
              onSelect={onSelect}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          ))}
        </ul>
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <UserMenu />
      </div>

      <AssetManagerModal
        isOpen={isAssetManagerOpen}
        onClose={() => setIsAssetManagerOpen(false)}
      />
    </div>
  )
}
