import { useState, useEffect, useCallback } from 'react'
import type { Presentation } from '../api/client'
import { fetchPresentations, createPresentation, updatePresentation, deletePresentation } from '../api/client'
import { useAsyncOperation } from './useAsyncOperation'

function withReload<T extends (...args: any[]) => Promise<any>>(fn: T, reload: () => Promise<void>) {
  return async (...args: Parameters<T>): Promise<void> => {
    await fn(...args)
    await reload()
  }
}

export function usePresentations(searchQuery: string, selectedTheme: string | null) {
  const [presentations, setPresentations] = useState<Presentation[]>([])

  const loadPresentations = useCallback(async () => {
    const data = await fetchPresentations(searchQuery, selectedTheme)
    setPresentations(data)
  }, [searchQuery, selectedTheme])

  useEffect(() => {
    loadPresentations().catch(error => console.error('Failed to load presentations:', error))
  }, [loadPresentations])

  const createOp = useCallback((title: string, content: string, theme_id: string | null) =>
    withReload(async () => { await createPresentation({ title, content, theme_id }) }, loadPresentations)(),
    [loadPresentations]
  )
  const updateOp = useCallback((id: string, title: string, content: string, theme_id: string | null) =>
    withReload(async () => { await updatePresentation(id, { title, content, theme_id }) }, loadPresentations)(),
    [loadPresentations]
  )
  const removeOp = useCallback((id: string) =>
    withReload(async () => { await deletePresentation(id) }, loadPresentations)(),
    [loadPresentations]
  )

  const [create, createLoading] = useAsyncOperation(createOp)
  const [update, updateLoading] = useAsyncOperation(updateOp)
  const [remove, removeLoading] = useAsyncOperation(removeOp)

  return {
    presentations,
    loading: createLoading || updateLoading || removeLoading,
    loadPresentations,
    create,
    update,
    remove,
  }
}
