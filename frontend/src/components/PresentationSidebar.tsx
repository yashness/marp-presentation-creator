import type { Presentation } from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { PresentationItem } from './PresentationItem'
import { UserMenu } from './UserMenu'
import { Plus, Presentation as PresentationIcon, Sparkles } from 'lucide-react'

interface PresentationSidebarProps {
  presentations: Presentation[]
  selectedId: string | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelect: (pres: Presentation) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onNewPresentation: () => void
  onAIGenerate?: () => void
}

export function PresentationSidebar({
  presentations,
  selectedId,
  searchQuery,
  onSearchChange,
  onSelect,
  onDelete,
  onDuplicate,
  onNewPresentation,
  onAIGenerate,
}: PresentationSidebarProps) {
  return (
    <div className="w-80 bg-gradient-to-br from-white via-primary-50/30 to-secondary-50/20 border-r border-primary-100 shadow-lg flex flex-col backdrop-blur-sm">
      <div className="p-6 border-b border-primary-100/50 bg-white/60 backdrop-blur-sm space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-700 to-secondary-600 bg-clip-text text-transparent flex items-center gap-2 mb-4">
          <PresentationIcon className="w-7 h-7 text-primary-600" />
          Presentations
        </h2>
        <Button onClick={onNewPresentation} className="w-full shadow-md hover:shadow-lg transition-all" variant="default">
          <Plus className="w-4 h-4" />
          New Presentation
        </Button>
        {onAIGenerate && (
          <Button onClick={onAIGenerate} className="w-full shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-secondary-500 to-primary-500 hover:from-secondary-600 hover:to-primary-600" variant="default">
            <Sparkles className="w-4 h-4" />
            AI Generate
          </Button>
        )}
      </div>

      <div className="p-4 border-b border-primary-100/50">
        <Input
          type="text"
          placeholder="Search presentations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full shadow-sm"
        />
      </div>

      <ul className="flex-1 overflow-y-auto p-3 space-y-2">
        {presentations.map(p => (
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

      <div className="p-4 border-t border-primary-100/50 bg-white/60 backdrop-blur-sm">
        <UserMenu />
      </div>
    </div>
  )
}
