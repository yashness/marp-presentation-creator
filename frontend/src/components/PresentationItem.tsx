import type { Presentation } from '../api/client'
import { Button } from './ui/button'
import { Trash2, Copy } from 'lucide-react'
import { formatLocalDate } from '../lib/utils'

interface PresentationItemProps {
  presentation: Presentation
  isSelected: boolean
  onSelect: (pres: Presentation) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

export function PresentationItem({ presentation, isSelected, onSelect, onDelete, onDuplicate }: PresentationItemProps) {
  return (
    <li className="group" onDoubleClick={() => onSelect(presentation)}>
      <div
        onClick={() => onSelect(presentation)}
        className={`cursor-pointer p-3 rounded-lg transition-all shadow-sm hover:shadow-md ${
          isSelected
            ? 'bg-gradient-to-r from-primary-100 to-secondary-100 border-l-4 border-primary-600 ring-2 ring-primary-200'
            : 'bg-white/70 hover:bg-white border-l-4 border-transparent hover:border-primary-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 truncate">
            <span className={`font-semibold truncate ${isSelected ? 'text-primary-900' : 'text-gray-800'}`}>{presentation.title}</span>
            <div className="text-xs text-gray-600 mt-0.5">{formatLocalDate(presentation.updated_at)}</div>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(presentation.id)
            }}
            size="icon"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate(presentation.id)
            }}
            size="icon"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-50"
          >
            <Copy className="w-4 h-4 text-primary-600" />
          </Button>
        </div>
      </div>
    </li>
  )
}
