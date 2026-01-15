import { useState } from 'react'
import type { Presentation, Folder } from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { PresentationItem } from './PresentationItem'
import { UserMenu } from './UserMenu'
import { AssetManagerModal } from './AssetManagerModal'
import { FolderTree } from './FolderTree'
import { Plus, Presentation as PresentationIcon, Sparkles, Image } from 'lucide-react'

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
}: PresentationSidebarProps) {
  const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false)

  const filteredPresentations = selectedFolderId
    ? presentations.filter(p => p.folder_id === selectedFolderId)
    : presentations

  return (
    <div className="h-[calc(100vh-64px)] border-r border-slate-200 bg-white flex flex-col shadow-sm">
      <div className="p-5 border-b border-slate-200 space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-2">
          <PresentationIcon className="w-5 h-5 text-primary-600" />
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

      <div className="p-4 border-b border-slate-200">
        <Input
          type="text"
          placeholder="Search presentations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-3 border-b border-slate-200 bg-white">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            onCreateFolder={onCreateFolder}
            onUpdateFolder={onUpdateFolder}
            onDeleteFolder={onDeleteFolder}
          />
        </div>

        <ul className="p-3 space-y-2">
          {filteredPresentations.map(p => (
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
