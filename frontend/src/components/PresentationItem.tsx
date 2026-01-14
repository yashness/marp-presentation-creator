import type { Presentation } from '../api/client'
import { Button } from './ui/button'
import { Trash2 } from 'lucide-react'

interface PresentationItemProps {
  presentation: Presentation
  isSelected: boolean
  onSelect: (pres: Presentation) => void
  onDelete: (id: string) => void
}

export function PresentationItem({ presentation, isSelected, onSelect, onDelete }: PresentationItemProps) {
  return (
    <li className="group" onDoubleClick={() => onSelect(presentation)}>
      <div
        onClick={() => onSelect(presentation)}
        className={`cursor-pointer p-3 rounded-md transition-all ${
          isSelected
            ? 'bg-primary-100 border-l-4 border-primary-600'
            : 'hover:bg-primary-50 border-l-4 border-transparent'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 truncate">
            <span className="font-medium text-gray-900 truncate">{presentation.title}</span>
            <div className="text-xs text-gray-500">{new Date(presentation.updated_at).toLocaleString()}</div>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(presentation.id)
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
  )
}
