/**
 * Reusable drag-and-drop hook for consistent drag-drop behavior
 */

import { useState } from 'react'
import { parseDragData, type DraggedItem } from '../lib/dragDropValidation'

interface UseDragDropOptions {
  onDrop: (item: DraggedItem) => void
  acceptedTypes?: Array<'presentation' | 'folder'>
}

interface UseDragDropReturn {
  isDragOver: boolean
  dragHandlers: {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
}

/**
 * Hook for managing drag-and-drop interactions
 */
export function useDragDrop({ onDrop, acceptedTypes }: UseDragDropOptions): UseDragDropReturn {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const data = parseDragData(e.dataTransfer)
    if (!data) {
      return
    }

    // Check if the dragged item type is accepted
    if (acceptedTypes && !acceptedTypes.includes(data.type)) {
      console.warn(`Drag-drop: rejected type "${data.type}", expected one of: ${acceptedTypes.join(', ')}`)
      return
    }

    onDrop(data)
  }

  return {
    isDragOver,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  }
}
