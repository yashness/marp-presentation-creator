import { useState, useCallback } from 'react'
import type { Presentation } from '../api/client'
import { getPreview, exportPresentation as apiExportPresentation } from '../api/client'
import { useAsyncOperation } from './useAsyncOperation'

interface EditorState {
  selectedId: string | null
  title: string
  content: string
  preview: string
  selectedTheme: string | null
}

const INITIAL_STATE: EditorState = {
  selectedId: null,
  title: '',
  content: '',
  preview: '',
  selectedTheme: null
}

export function usePresentationEditor() {
  const [state, setState] = useState<EditorState>(INITIAL_STATE)

  const setTitle = useCallback((title: string) => setState(s => ({ ...s, title })), [])
  const setContent = useCallback((content: string) => setState(s => ({ ...s, content })), [])
  const setSelectedTheme = useCallback((selectedTheme: string | null) => setState(s => ({ ...s, selectedTheme })), [])
  const clearSelection = useCallback(() => setState(INITIAL_STATE), [])

  const selectPresentationOp = useCallback(async (pres: Presentation) => {
    setState({
      selectedId: pres.id,
      title: pres.title,
      content: pres.content,
      preview: '',
      selectedTheme: pres.theme_id || null
    })
    const html = await getPreview(pres.id)
    setState(s => ({ ...s, preview: html }))
  }, [])

  const refreshPreviewOp = useCallback(async () => {
    if (!state.selectedId) return
    const html = await getPreview(state.selectedId)
    setState(s => ({ ...s, preview: html }))
  }, [state.selectedId])

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
    setTitle,
    setContent,
    setSelectedTheme,
    clearSelection,
    selectPresentation,
    refreshPreview,
    exportPresentation,
  }
}
