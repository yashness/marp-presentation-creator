import { useState } from 'react'
import type { Presentation } from '../api/client'
import { getPreview, exportPresentation as apiExportPresentation } from '../api/client'

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

  async function selectPresentation(pres: Presentation) {
    setSelectedId(pres.id)
    setTitle(pres.title)
    setContent(pres.content)
    setSelectedTheme(pres.theme_id || null)
    try {
      const html = await getPreview(pres.id)
      setPreview(html)
    } catch (error) {
      console.error('Failed to load preview:', error)
      throw error
    }
  }

  async function refreshPreview() {
    if (!selectedId) return
    try {
      const html = await getPreview(selectedId)
      setPreview(html)
    } catch (error) {
      console.error('Failed to load preview:', error)
      throw error
    }
  }

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
    setTitle,
    setContent,
    setSelectedTheme,
    clearSelection,
    selectPresentation,
    refreshPreview,
    exportPresentation,
  }
}
