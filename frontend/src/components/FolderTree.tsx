import { useState } from 'react'
import { Folder, ChevronRight, ChevronDown, FolderPlus, Edit2, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import type { Folder as FolderType } from '../api/client'

interface FolderTreeProps {
  folders: FolderType[]
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onUpdateFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
}

interface FolderNodeProps {
  folder: FolderType
  folders: FolderType[]
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onUpdateFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
}

function FolderNode({
  folder,
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder
}: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const children = folders.filter(f => f.parent_id === folder.id)
  const hasChildren = children.length > 0

  const handleRename = () => {
    if (editName.trim()) {
      onUpdateFolder(folder.id, editName.trim())
      setIsEditing(false)
    }
  }

  const handleCreate = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), folder.id)
      setNewFolderName('')
      setIsCreating(false)
      setIsExpanded(true)
    }
  }

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 cursor-pointer group ${
          selectedFolderId === folder.id ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
        }`}
        onClick={() => onSelectFolder(folder.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className="p-0.5 hover:bg-slate-200 rounded"
        >
          {hasChildren && (
            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
          {!hasChildren && <div className="w-4 h-4" />}
        </button>

        <Folder className="w-4 h-4 text-primary-500 flex-shrink-0" />

        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') {
                setEditName(folder.name)
                setIsEditing(false)
              }
            }}
            onBlur={handleRename}
            onClick={(e) => e.stopPropagation()}
            className="h-6 text-sm flex-1"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsCreating(true)
              setIsExpanded(true)
            }}
            className="p-1 hover:bg-slate-200 rounded"
            title="New subfolder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="p-1 hover:bg-slate-200 rounded"
            title="Rename"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Delete folder "${folder.name}"?`)) {
                onDeleteFolder(folder.id)
              }
            }}
            className="p-1 hover:bg-red-100 text-red-600 rounded"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-1">
          {isCreating && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Folder className="w-4 h-4 text-primary-300" />
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') {
                    setNewFolderName('')
                    setIsCreating(false)
                  }
                }}
                onBlur={() => {
                  if (newFolderName.trim()) {
                    handleCreate()
                  } else {
                    setIsCreating(false)
                  }
                }}
                placeholder="Folder name"
                className="h-6 text-sm flex-1"
                autoFocus
              />
            </div>
          )}

          {children.map(child => (
            <FolderNode
              key={child.id}
              folder={child}
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onUpdateFolder={onUpdateFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder
}: FolderTreeProps) {
  const [isCreatingRoot, setIsCreatingRoot] = useState(false)
  const [newRootName, setNewRootName] = useState('')

  const rootFolders = folders.filter(f => !f.parent_id)

  const handleCreateRoot = () => {
    if (newRootName.trim()) {
      onCreateFolder(newRootName.trim(), null)
      setNewRootName('')
      setIsCreatingRoot(false)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold text-slate-500 uppercase">Folders</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreatingRoot(true)}
          className="h-6 px-2"
        >
          <FolderPlus className="w-4 h-4" />
        </Button>
      </div>

      {isCreatingRoot && (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Folder className="w-4 h-4 text-primary-300" />
          <Input
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateRoot()
              if (e.key === 'Escape') {
                setNewRootName('')
                setIsCreatingRoot(false)
              }
            }}
            onBlur={() => {
              if (newRootName.trim()) {
                handleCreateRoot()
              } else {
                setIsCreatingRoot(false)
              }
            }}
            placeholder="Folder name"
            className="h-6 text-sm flex-1"
            autoFocus
          />
        </div>
      )}

      <div
        className={`px-2 py-1.5 rounded-md hover:bg-slate-100 cursor-pointer flex items-center gap-2 ${
          selectedFolderId === null ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
        }`}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium">All Presentations</span>
      </div>

      {rootFolders.map(folder => (
        <FolderNode
          key={folder.id}
          folder={folder}
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onCreateFolder={onCreateFolder}
          onUpdateFolder={onUpdateFolder}
          onDeleteFolder={onDeleteFolder}
        />
      ))}
    </div>
  )
}
