import { useState, useCallback } from 'react'
import {
  createVersion,
  listVersions,
  restoreVersion,
  deleteVersion,
} from '../api/client'
import type {
  PresentationVersion,
  RestoreVersionResponse
} from '../api/client'

interface UseVersioningOptions {
  onRestore?: (data: RestoreVersionResponse) => void
  onError?: (error: Error) => void
}

export function useVersioning(
  presentationId: string | null,
  options: UseVersioningOptions = {}
) {
  const { onRestore, onError } = options
  const [versions, setVersions] = useState<PresentationVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load versions for the current presentation
  const loadVersions = useCallback(async () => {
    if (!presentationId) {
      setVersions([])
      return
    }

    setIsLoading(true)
    try {
      const data = await listVersions(presentationId)
      setVersions(data)
    } catch (error) {
      console.error('Failed to load versions:', error)
      onError?.(error as Error)
    } finally {
      setIsLoading(false)
    }
  }, [presentationId, onError])

  // Create a new checkpoint
  const saveCheckpoint = useCallback(async (name?: string) => {
    if (!presentationId) return null

    setIsSaving(true)
    try {
      const version = await createVersion(presentationId, name)
      setVersions(prev => [version, ...prev])
      return version
    } catch (error) {
      console.error('Failed to save checkpoint:', error)
      onError?.(error as Error)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [presentationId, onError])

  // Restore to a specific version
  const restore = useCallback(async (versionId: string) => {
    setIsLoading(true)
    try {
      const result = await restoreVersion(versionId)
      onRestore?.(result)
      // Reload versions to get the backup that was created
      await loadVersions()
      return result
    } catch (error) {
      console.error('Failed to restore version:', error)
      onError?.(error as Error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [loadVersions, onRestore, onError])

  // Delete a version
  const remove = useCallback(async (versionId: string) => {
    try {
      await deleteVersion(versionId)
      setVersions(prev => prev.filter(v => v.id !== versionId))
      return true
    } catch (error) {
      console.error('Failed to delete version:', error)
      onError?.(error as Error)
      return false
    }
  }, [onError])

  return {
    versions,
    isLoading,
    isSaving,
    loadVersions,
    saveCheckpoint,
    restore,
    remove
  }
}
