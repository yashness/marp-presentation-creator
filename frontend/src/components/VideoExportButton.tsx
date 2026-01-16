import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from './ui/button'
import { Video, Settings, Download, RefreshCw, X, Loader2 } from 'lucide-react'
import {
  startVideoExportAsync,
  getVideoJobProgress,
  cancelVideoJob,
  checkVideoExists,
  type VideoJobProgress,
  type VideoExistsResponse,
} from '../api/client'
import { API_BASE_URL } from '../lib/constants'
import { useToast } from '../contexts/ToastContext'

interface VideoExportButtonProps {
  presentationId: string | null
  presentationTitle: string
}

export function VideoExportButton({ presentationId, presentationTitle }: VideoExportButtonProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [voice, setVoice] = useState('af_bella')
  const [speed, setSpeed] = useState(1.0)
  const [slideDuration, setSlideDuration] = useState(5.0)
  const [existingVideo, setExistingVideo] = useState<VideoExistsResponse | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  // Job tracking state
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [jobProgress, setJobProgress] = useState<VideoJobProgress | null>(null)
  const pollingRef = useRef<number | null>(null)
  const { showToast } = useToast()

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const checkVideoStatus = useCallback(async () => {
    if (!presentationId) {
      setExistingVideo(null)
      return
    }

    setIsChecking(true)
    try {
      const data = await checkVideoExists(presentationId)
      setExistingVideo(data)

      // If there's an active job, start polling
      if (data.active_job_id && !currentJobId) {
        setCurrentJobId(data.active_job_id)
      }
    } catch (error) {
      console.error('Failed to check video status:', error)
    } finally {
      setIsChecking(false)
    }
  }, [presentationId, currentJobId])

  useEffect(() => {
    checkVideoStatus()
  }, [checkVideoStatus])

  // Polling for job progress
  useEffect(() => {
    if (!currentJobId) {
      stopPolling()
      return
    }

    const pollProgress = async () => {
      try {
        const progress = await getVideoJobProgress(currentJobId)
        setJobProgress(progress)

        if (progress.status === 'completed') {
          stopPolling()
          setCurrentJobId(null)
          setJobProgress(null)
          showToast('Video export completed', 'success')
          checkVideoStatus()
        } else if (progress.status === 'failed') {
          stopPolling()
          setCurrentJobId(null)
          showToast(progress.error || 'Video export failed', 'error')
        } else if (progress.status === 'cancelled') {
          stopPolling()
          setCurrentJobId(null)
          setJobProgress(null)
          showToast('Video export cancelled', 'info')
        }
      } catch (error) {
        console.error('Failed to get job progress:', error)
      }
    }

    pollProgress()
    pollingRef.current = window.setInterval(pollProgress, 1500)

    return () => stopPolling()
  }, [currentJobId, stopPolling, checkVideoStatus, showToast])

  const handleExport = async () => {
    if (!presentationId) return

    setShowSettings(false)

    try {
      const response = await startVideoExportAsync(presentationId, {
        voice,
        speed,
        slide_duration: slideDuration
      })
      setCurrentJobId(response.job_id)
      showToast('Video export started', 'info')
    } catch (error) {
      console.error('Video export failed:', error)
      showToast(error instanceof Error ? error.message : 'Failed to start export', 'error')
    }
  }

  const handleCancel = async () => {
    if (!currentJobId) return

    try {
      await cancelVideoJob(currentJobId)
      showToast('Cancelling export...', 'info')
    } catch (error) {
      console.error('Failed to cancel job:', error)
      showToast('Failed to cancel export', 'error')
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

  const isExporting = currentJobId !== null

  return (
    <div className="relative">
      <div className="flex gap-2">
        {isExporting && jobProgress ? (
          <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-lg px-3 py-1.5">
            <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
            <div className="flex flex-col min-w-[120px]">
              <span className="text-xs font-medium text-primary-700">{jobProgress.current_stage}</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-primary-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${jobProgress.progress}%` }}
                  />
                </div>
                <span className="text-xs text-primary-600">{jobProgress.progress}%</span>
              </div>
            </div>
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
              title="Cancel export"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : existingVideo?.exists ? (
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
              disabled={!presentationId}
              className="w-8 h-8"
              title="Re-export video"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={!presentationId}
            className="flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            MP4
          </Button>
        )}
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="ghost"
          size="icon"
          disabled={!presentationId || isExporting}
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
