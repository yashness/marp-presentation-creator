import { useState, useCallback, useEffect, useRef } from 'react'

interface UndoState<T> {
  past: T[]
  present: T
  future: T[]
}

interface UseUndoRedoOptions {
  maxHistory?: number
  debounceMs?: number
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
) {
  const { maxHistory = 50, debounceMs = 500 } = options

  const [state, setState] = useState<UndoState<T>>({
    past: [],
    present: initialState,
    future: []
  })

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedValue = useRef<T>(initialState)

  // Set new value with undo history
  const set = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(s => {
      const value = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(s.present)
        : newValue

      // If value hasn't changed, don't update
      if (JSON.stringify(value) === JSON.stringify(s.present)) {
        return s
      }

      // Clear debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      // Debounce adding to history
      debounceTimer.current = setTimeout(() => {
        setState(current => {
          if (JSON.stringify(current.present) !== JSON.stringify(lastSavedValue.current)) {
            const newPast = [...current.past, lastSavedValue.current].slice(-maxHistory)
            lastSavedValue.current = current.present
            return {
              past: newPast,
              present: current.present,
              future: []
            }
          }
          return current
        })
      }, debounceMs)

      return {
        ...s,
        present: value,
        future: []
      }
    })
  }, [maxHistory, debounceMs])

  // Force save current state to history (for explicit checkpoints)
  const checkpoint = useCallback((_label?: string) => {
    setState(s => {
      if (JSON.stringify(s.present) === JSON.stringify(lastSavedValue.current)) {
        return s
      }
      const newPast = [...s.past, lastSavedValue.current].slice(-maxHistory)
      lastSavedValue.current = s.present
      return {
        past: newPast,
        present: s.present,
        future: []
      }
    })
  }, [maxHistory])

  // Undo to previous state
  const undo = useCallback(() => {
    setState(s => {
      if (s.past.length === 0) return s

      const previous = s.past[s.past.length - 1]
      const newPast = s.past.slice(0, -1)

      lastSavedValue.current = previous

      return {
        past: newPast,
        present: previous,
        future: [s.present, ...s.future]
      }
    })
  }, [])

  // Redo to next state
  const redo = useCallback(() => {
    setState(s => {
      if (s.future.length === 0) return s

      const next = s.future[0]
      const newFuture = s.future.slice(1)

      lastSavedValue.current = next

      return {
        past: [...s.past, s.present],
        present: next,
        future: newFuture
      }
    })
  }, [])

  // Clear all history
  const clear = useCallback(() => {
    setState(s => ({
      past: [],
      present: s.present,
      future: []
    }))
  }, [])

  // Reset to initial state
  const reset = useCallback((newInitial?: T) => {
    const value = newInitial !== undefined ? newInitial : initialState
    lastSavedValue.current = value
    setState({
      past: [],
      present: value,
      future: []
    })
  }, [initialState])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modKey = isMac ? e.metaKey : e.ctrlKey

      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (modKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      } else if (modKey && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  return {
    value: state.present,
    set,
    undo,
    redo,
    checkpoint,
    clear,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    historyLength: state.past.length,
    futureLength: state.future.length
  }
}
