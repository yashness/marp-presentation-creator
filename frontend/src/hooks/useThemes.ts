import { useState, useEffect, useCallback } from 'react'
import type { Theme, ThemeCreatePayload } from '../api/client'
import { fetchThemes, createTheme as apiCreateTheme, updateTheme as apiUpdateTheme, deleteTheme as apiDeleteTheme } from '../api/client'
import { useAsyncOperation } from './useAsyncOperation'

export function useThemes() {
  const [themes, setThemes] = useState<Theme[]>([])

  const loadThemesOp = useCallback(async () => {
    const data = await fetchThemes()
    setThemes(data)
  }, [])

  const [loadThemes, loading] = useAsyncOperation(loadThemesOp)

  const createThemeOp = useCallback(async (data: ThemeCreatePayload) => {
    const created = await apiCreateTheme(data)
    await loadThemes()
    return created
  }, [loadThemes])

  const updateThemeOp = useCallback(async (id: string, data: ThemeCreatePayload) => {
    const updated = await apiUpdateTheme(id, data)
    await loadThemes()
    return updated
  }, [loadThemes])

  const deleteThemeOp = useCallback(async (id: string) => {
    await apiDeleteTheme(id)
    await loadThemes()
  }, [loadThemes])

  const [createTheme, creating] = useAsyncOperation(createThemeOp)
  const [updateTheme, updating] = useAsyncOperation(updateThemeOp)
  const [deleteTheme, deleting] = useAsyncOperation(deleteThemeOp)

  useEffect(() => {
    loadThemes().catch(error => console.error('Failed to load themes:', error))
  }, [loadThemes])

  return {
    themes,
    loading: loading || creating || updating || deleting,
    createTheme,
    updateTheme,
    deleteTheme,
    reloadThemes: loadThemes
  }
}
