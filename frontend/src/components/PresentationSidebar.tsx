import type { Presentation } from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { PresentationItem } from './PresentationItem'
import { Plus, Presentation as PresentationIcon } from 'lucide-react'

interface PresentationSidebarProps {
  presentations: Presentation[]
  selectedId: string | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelect: (pres: Presentation) => void
  onDelete: (id: string) => void
  onNewPresentation: () => void
}

export function PresentationSidebar({
  presentations,
  selectedId,
  searchQuery,
  onSearchChange,
  onSelect,
  onDelete,
  onNewPresentation,
}: PresentationSidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-primary-200 shadow-lg flex flex-col">
      <div className="p-6 border-b border-primary-200">
        <h2 className="text-2xl font-bold text-primary-900 flex items-center gap-2 mb-4">
          <PresentationIcon className="w-6 h-6 text-primary-600" />
          Presentations
        </h2>
        <Button onClick={onNewPresentation} className="w-full" variant="default">
          <Plus className="w-4 h-4" />
          New Presentation
        </Button>
      </div>

      <div className="p-4 border-b border-primary-200">
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      <ul className="flex-1 overflow-y-auto p-2 space-y-2">
        {presentations.map(p => (
          <PresentationItem
            key={p.id}
            presentation={p}
            isSelected={selectedId === p.id}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  )
}
