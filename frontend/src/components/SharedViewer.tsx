import { useState, useEffect, useCallback } from 'react'
import { getShareInfo, accessSharedPresentation, trackView } from '../api/client'
import type { ShareInfo, SharedPresentation } from '../api/client'
import { API_BASE_URL } from '../lib/constants'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Loader2, Lock, AlertCircle, Eye, Download } from 'lucide-react'

interface SharedViewerProps {
  token: string
}

export function SharedViewer({ token }: SharedViewerProps) {
  const [info, setInfo] = useState<ShareInfo | null>(null)
  const [presentation, setPresentation] = useState<SharedPresentation | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)

  const loadInfo = useCallback(async () => {
    try {
      const data = await getShareInfo(token)
      setInfo(data)
      if (!data.requires_password) {
        await loadPresentation()
      } else {
        setNeedsPassword(true)
        setLoading(false)
      }
    } catch (err) {
      setError('This share link is invalid or has expired.')
      setLoading(false)
    }
  }, [token])

  const loadPresentation = async (pwd?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await accessSharedPresentation(token, pwd || null)
      setPresentation(data)
      setNeedsPassword(false)
      await loadPreview(data)
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        setError('Incorrect password')
        setNeedsPassword(true)
      } else {
        setError('Failed to load presentation')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadPreview = async (pres: SharedPresentation) => {
    try {
      // Build preview from content
      const response = await fetch(`${API_BASE_URL}/api/presentations/${pres.id}/preview`)
      if (response.ok) {
        const html = await response.text()
        setPreview(html)
      }
      // Track view (async, fire and forget)
      trackView(pres.id, undefined, undefined, true).catch(() => {})
    } catch {
      // If preview fails, we'll just show the content
    }
  }

  useEffect(() => {
    loadInfo()
  }, [loadInfo])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadPresentation(password)
  }

  if (loading && !needsPassword) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sky-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading presentation...</p>
        </div>
      </div>
    )
  }

  if (error && !needsPassword) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Link Not Found</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-full max-w-sm p-6 bg-slate-900 rounded-xl border border-slate-800">
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-white">{info?.title || 'Protected Presentation'}</h1>
            <p className="text-slate-400 text-sm mt-1">This presentation is password protected</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="bg-slate-800 border-slate-700"
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              View Presentation
            </Button>
          </form>
        </div>
      </div>
    )
  }

  if (!presentation) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs grid place-items-center">
            MP
          </div>
          <h1 className="text-lg font-semibold text-white truncate max-w-md">
            {presentation.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const link = document.createElement('a')
              link.href = `${API_BASE_URL}/api/presentations/${presentation.id}/export?format=pdf`
              link.download = `${presentation.title}.pdf`
              link.click()
            }}
            className="border-slate-700 text-slate-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </header>

      {/* Preview */}
      <main className="flex-1 overflow-hidden">
        {preview ? (
          <iframe
            srcDoc={preview}
            className="w-full h-full border-0"
            title="Presentation Preview"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <pre className="max-w-4xl p-8 whitespace-pre-wrap font-mono text-sm">
              {presentation.content}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
}
