import { useState, useCallback } from 'react'
import type { Presentation } from '../api/client'
import { getPreview, exportPresentation as apiExportPresentation } from '../api/client'
import { useAsyncOperation } from './useAsyncOperation'
import { DEFAULT_THEME } from '../lib/constants'
import { setFrontmatterValue } from '../lib/markdown'

interface EditorState {
  selectedId: string | null
  title: string
  content: string
  preview: string
  selectedTheme: string | null
}

const DEFAULT_TITLE = 'Untitled presentation'

const buildFrontmatter = (title: string, theme: string | null) => `---
marp: true
title: "${title || DEFAULT_TITLE}"
theme: ${theme || DEFAULT_THEME}
paginate: true
---

# Slide 1

- Add your talking points here
`

const getInitialState = (): EditorState => ({
  selectedId: null,
  title: '',
  content: buildFrontmatter('', null),
  preview: '',
  selectedTheme: null
})

const INITIAL_STATE: EditorState = getInitialState()

export function usePresentationEditor() {
  const [state, setState] = useState<EditorState>(INITIAL_STATE)

  const setTitle = useCallback((title: string) => setState(s => ({ ...s, title })), [])
  const setContent = useCallback((content: string) => setState(s => ({ ...s, content })), [])
  const setSelectedTheme = useCallback((selectedTheme: string | null) => setState(s => ({ ...s, selectedTheme })), [])
  const clearSelection = useCallback(() => setState(getInitialState()), [])
  const setPreview = useCallback((preview: string) => setState(s => ({ ...s, preview })), [])
  const setFromServer = useCallback((pres: Presentation) => {
    setState(s => ({
      ...s,
      selectedId: pres.id,
      title: pres.title,
      content: pres.content || buildFrontmatter(pres.title, pres.theme_id || null),
      selectedTheme: pres.theme_id || null,
    }))
  }, [])

  const setCreatedMeta = useCallback((pres: Presentation) => {
    setState(s => ({
      ...s,
      selectedId: pres.id,
      selectedTheme: pres.theme_id || null,
    }))
  }, [])

  const applyThemeToContent = useCallback((themeId: string | null) => {
    setState(s => ({
      ...s,
      selectedTheme: themeId,
      content: setFrontmatterValue(s.content, 'theme', themeId || DEFAULT_THEME),
    }))
  }, [])

  const selectPresentationOp = useCallback(async (pres: Presentation) => {
    setState({
      selectedId: pres.id,
      title: pres.title,
      content: pres.content || buildFrontmatter(pres.title, pres.theme_id || null),
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
    setPreview,
    setFromServer,
    setCreatedMeta,
    applyThemeToContent,
    selectPresentation,
    refreshPreview,
    exportPresentation,
  }
}
