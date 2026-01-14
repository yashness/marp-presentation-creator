import { useState, useCallback } from 'react'
import type { Presentation } from '../api/client'
import { getPreview, exportPresentation as apiExportPresentation } from '../api/client'
import { useAsyncOperation } from './useAsyncOperation'

function useEditorState() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  return { selectedId, setSelectedId, title, setTitle, content, setContent, preview, setPreview, selectedTheme, setSelectedTheme }
}

function loadPresentationState(pres: Presentation, setState: ReturnType<typeof useEditorState>) {
  setState.setSelectedId(pres.id)
  setState.setTitle(pres.title)
  setState.setContent(pres.content)
  setState.setSelectedTheme(pres.theme_id || null)
}

export function usePresentationEditor() {
  const state = useEditorState()

  const clearSelection = useCallback(() => {
    state.setSelectedId(null)
    state.setTitle('')
    state.setContent('')
    state.setPreview('')
    state.setSelectedTheme(null)
  }, [state])

  const selectPresentationOp = useCallback(async (pres: Presentation) => {
    loadPresentationState(pres, state)
    const html = await getPreview(pres.id)
    state.setPreview(html)
  }, [state])

  const refreshPreviewOp = useCallback(async () => {
    if (!state.selectedId) return
    const html = await getPreview(state.selectedId)
    state.setPreview(html)
  }, [state.selectedId, state])

  const [selectPresentation, previewLoading1] = useAsyncOperation(selectPresentationOp)
  const [refreshPreview, previewLoading2] = useAsyncOperation(refreshPreviewOp)

  const exportPresentation = useCallback(async (format: 'pdf' | 'html' | 'pptx') => {
    if (!state.selectedId) return
    await apiExportPresentation(state.selectedId, state.title, format)
  }, [state.selectedId, state.title])

  return {
    selectedId: state.selectedId,
    title: state.title,
    content: state.content,
    preview: state.preview,
    selectedTheme: state.selectedTheme,
    previewLoading: previewLoading1 || previewLoading2,
    setTitle: state.setTitle,
    setContent: state.setContent,
    setSelectedTheme: state.setSelectedTheme,
    clearSelection,
    selectPresentation,
    refreshPreview,
    exportPresentation,
  }
}
