import { useState, useEffect, useCallback } from 'react'
import type { Theme } from '../api/client'
import { fetchThemes } from '../api/client'
import { useAsyncOperation } from './useAsyncOperation'

export function useThemes() {
  const [themes, setThemes] = useState<Theme[]>([])

  const loadThemesOp = useCallback(async () => {
    const data = await fetchThemes()
    setThemes(data)
  }, [])

  const [loadThemes, loading] = useAsyncOperation(loadThemesOp)

  useEffect(() => {
    loadThemes().catch(error => console.error('Failed to load themes:', error))
  }, [loadThemes])

  return { themes, loading }
}
