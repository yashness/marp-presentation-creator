import type { Presentation } from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Plus, Search, Trash2, Presentation as PresentationIcon } from 'lucide-react'

interface PresentationSidebarProps {
  presentations: Presentation[]
  selectedId: string | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearch: () => void
  onSelect: (pres: Presentation) => void
  onDelete: (id: string) => void
  onNewPresentation: () => void
}

export function PresentationSidebar({
  presentations,
  selectedId,
  searchQuery,
  onSearchChange,
  onSearch,
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
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1"
          />
          <Button onClick={onSearch} size="icon" variant="outline">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto p-2 space-y-2">
        {presentations.map(p => (
          <li key={p.id} className="group">
            <div
              onClick={() => onSelect(p)}
              className={`cursor-pointer p-3 rounded-md transition-all ${
                selectedId === p.id
                  ? 'bg-primary-100 border-l-4 border-primary-600'
                  : 'hover:bg-primary-50 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 truncate flex-1">{p.title}</span>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(p.id)
                  }}
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
