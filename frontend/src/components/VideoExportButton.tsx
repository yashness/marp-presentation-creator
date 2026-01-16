import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Video, Settings, Download, RefreshCw } from 'lucide-react'
import { exportPresentationAsVideo } from '../api/client'
import { API_BASE_URL } from '../lib/constants'

interface VideoExportButtonProps {
  presentationId: string | null
  presentationTitle: string
}

interface VideoExistsResponse {
  exists: boolean
  video_url?: string
  file_size?: number
}

export function VideoExportButton({ presentationId, presentationTitle }: VideoExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [voice, setVoice] = useState('af_bella')
  const [speed, setSpeed] = useState(1.0)
  const [slideDuration, setSlideDuration] = useState(5.0)
  const [existingVideo, setExistingVideo] = useState<VideoExistsResponse | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkVideoExists = useCallback(async () => {
    if (!presentationId) {
      setExistingVideo(null)
      return
    }

    setIsChecking(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/video/${presentationId}/exists`)
      if (response.ok) {
        const data: VideoExistsResponse = await response.json()
        setExistingVideo(data)
      }
    } catch (error) {
      console.error('Failed to check video status:', error)
    } finally {
      setIsChecking(false)
    }
  }, [presentationId])

  useEffect(() => {
    checkVideoExists()
  }, [checkVideoExists])

  const handleExport = async () => {
    if (!presentationId) return

    setIsExporting(true)
    setShowSettings(false)

    try {
      await exportPresentationAsVideo(presentationId, presentationTitle, {
        voice,
        speed,
        slide_duration: slideDuration
      })
      // Refresh video status after export
      await checkVideoExists()
    } catch (error) {
      console.error('Video export failed:', error)
      alert(error instanceof Error ? error.message : 'Video export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownload = () => {
    if (existingVideo?.video_url) {
      const link = document.createElement('a')
      link.href = `${API_BASE_URL}${existingVideo.video_url}`
      link.download = `${presentationTitle}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        {existingVideo?.exists ? (
          <>
            <Button
              onClick={handleDownload}
              variant="outline"
              disabled={!presentationId || isChecking}
              className="flex items-center gap-2"
              title={`Download video (${existingVideo.file_size ? formatFileSize(existingVideo.file_size) : ''})`}
            >
              <Download className="w-4 h-4" />
              MP4
            </Button>
            <Button
              onClick={handleExport}
              variant="ghost"
              size="icon"
              disabled={!presentationId || isExporting}
              className="w-8 h-8"
              title="Re-export video"
            >
              {isExporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={!presentationId || isExporting}
            className="flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'MP4'}
          </Button>
        )}
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="ghost"
          size="icon"
          disabled={!presentationId}
          className="w-8 h-8"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {showSettings && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-white rounded-lg border border-slate-200 shadow-lg z-50 min-w-[280px] space-y-3">
          <p className="text-sm font-semibold text-slate-700">Video Export Settings</p>

          <div className="space-y-2">
            <label className="text-xs text-slate-600">Voice</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="af_bella">AF - Bella</option>
              <option value="af_heart">AF - Heart</option>
              <option value="af_nicole">AF - Nicole</option>
              <option value="af_sarah">AF - Sarah</option>
              <option value="af_sky">AF - Sky</option>
              <option value="am_adam">AM - Adam</option>
              <option value="am_michael">AM - Michael</option>
              <option value="bf_emma">BF - Emma</option>
              <option value="bf_isabella">BF - Isabella</option>
              <option value="bm_george">BM - George</option>
              <option value="bm_lewis">BM - Lewis</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-600">Speed: {speed.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-600">Slide Duration (no audio): {slideDuration}s</label>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={slideDuration}
              onChange={(e) => setSlideDuration(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleExport} className="flex-1">
              Export Video
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
