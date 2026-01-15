/**
 * Type-safe validation for drag-and-drop data
 */

export interface DraggedPresentation {
  type: 'presentation'
  id: string
}

export interface DraggedFolder {
  type: 'folder'
  id: string
}

export type DraggedItem = DraggedPresentation | DraggedFolder

/**
 * Validate and parse drag data from DataTransfer
 */
export function parseDragData(dataTransfer: DataTransfer): DraggedItem | null {
  try {
    const jsonString = dataTransfer.getData('application/json')
    if (!jsonString) {
      return null
    }

    const data = JSON.parse(jsonString)

    // Validate structure
    if (typeof data !== 'object' || data === null) {
      console.error('Invalid drag data: not an object')
      return null
    }

    if (!('type' in data) || !('id' in data)) {
      console.error('Invalid drag data: missing type or id')
      return null
    }

    if (typeof data.type !== 'string' || typeof data.id !== 'string') {
      console.error('Invalid drag data: type or id not strings')
      return null
    }

    if (data.type !== 'presentation' && data.type !== 'folder') {
      console.error(`Invalid drag data: unknown type "${data.type}"`)
      return null
    }

    // UUID validation (basic format check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(data.id)) {
      console.error(`Invalid drag data: id is not a valid UUID`)
      return null
    }

    return data as DraggedItem
  } catch (err) {
    console.error('Failed to parse drag data:', err)
    return null
  }
}

/**
 * Create drag data payload for presentations
 */
export function createPresentationDragData(id: string): DraggedPresentation {
  return { type: 'presentation', id }
}

/**
 * Create drag data payload for folders
 */
export function createFolderDragData(id: string): DraggedFolder {
  return { type: 'folder', id }
}
