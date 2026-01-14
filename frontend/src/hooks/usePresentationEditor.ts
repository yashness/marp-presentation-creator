import { useState, useCallback } from 'react'
import type { Presentation } from '../api/client'
import { getPreview, exportPresentation as apiExportPresentation } from '../api/client'
import { useAsyncOperation } from './useAsyncOperation'

export function usePresentationEditor() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  function clearSelection() {
    setSelectedId(null)
    setTitle('')
    setContent('')
    setPreview('')
    setSelectedTheme(null)
  }

  const selectPresentationOp = useCallback(async (pres: Presentation) => {
    setSelectedId(pres.id)
    setTitle(pres.title)
    setContent(pres.content)
    setSelectedTheme(pres.theme_id || null)
    const html = await getPreview(pres.id)
    setPreview(html)
  }, [])

  const refreshPreviewOp = useCallback(async () => {
    if (!selectedId) return
    const html = await getPreview(selectedId)
    setPreview(html)
  }, [selectedId])

  const [selectPresentation, previewLoading1] = useAsyncOperation(selectPresentationOp)
  const [refreshPreview, previewLoading2] = useAsyncOperation(refreshPreviewOp)

  const previewLoading = previewLoading1 || previewLoading2

  async function exportPresentation(format: 'pdf' | 'html' | 'pptx') {
    if (!selectedId) return
    await apiExportPresentation(selectedId, title, format)
  }

  return {
    selectedId,
    title,
    content,
    preview,
    selectedTheme,
    previewLoading,
    setTitle,
    setContent,
    setSelectedTheme,
    clearSelection,
    selectPresentation,
    refreshPreview,
    exportPresentation,
  }
}
