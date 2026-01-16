import { useEffect, useState, useRef, useCallback } from 'react'
import { Volume2, Loader2, Play, Pause } from 'lucide-react'
import { Button } from './ui/button'
import { Select } from './ui/select'
import { API_BASE_URL } from '../lib/constants'

interface TTSButtonProps {
  presentationId: string | null
  slideIndex: number
  commentText: string
  onAudioGenerated?: (audioUrl: string) => void
}

/**
 * Compute a simple hash matching the backend's first 16 chars of SHA-256.
 * Uses SubtleCrypto when available, falls back to simple hash.
 */
async function computeContentHash(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex.slice(0, 16)
  }
  // Fallback for environments without SubtleCrypto
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash.toString(16).padStart(16, '0').slice(0, 16)
}

export function TTSButton({ presentationId, slideIndex, commentText, onAudioGenerated }: TTSButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [voice, setVoice] = useState('af_bella')
  const [speed, setSpeed] = useState(1.0)
  const [showOptions, setShowOptions] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [audioAvailable, setAudioAvailable] = useState(false)
  const [contentHash, setContentHash] = useState<string | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  // Compute content hash when comment changes
  useEffect(() => {
    if (!commentText?.trim()) {
      setContentHash(null)
      return
    }
    computeContentHash(commentText).then(setContentHash)
  }, [commentText])

  // Check for existing audio by content hash
  const checkAudioExists = useCallback(async () => {
    if (!presentationId || !contentHash) {
      setAudioAvailable(false)
      setAudioUrl(null)
      return
    }

    try {
      const hashEndpoint = `${API_BASE_URL}/api/tts/${presentationId}/audio/hash/${contentHash}`
      const response = await fetch(hashEndpoint, { method: 'HEAD' })

      if (response.ok) {
        setAudioAvailable(true)
        setAudioUrl(`${hashEndpoint}?t=${Date.now()}`)
      } else {
        // Fallback: check old slide-index based audio
        const legacyEndpoint = `${API_BASE_URL}/api/tts/${presentationId}/slides/${slideIndex}/audio`
        const legacyResponse = await fetch(legacyEndpoint, { method: 'HEAD' })

        if (legacyResponse.ok) {
          setAudioAvailable(true)
          setAudioUrl(`${legacyEndpoint}?t=${Date.now()}`)
          setStatusMessage('Legacy audio found (may not match current content)')
        } else {
          setAudioAvailable(false)
          setAudioUrl(null)
        }
      }
    } catch {
      setAudioAvailable(false)
      setAudioUrl(null)
    }
  }, [presentationId, contentHash, slideIndex])

  useEffect(() => {
    checkAudioExists()
  }, [checkAudioExists])

  const handleGenerateAudio = async () => {
    if (!presentationId || !commentText || !commentText.trim()) {
      setStatusMessage('Add a slide comment before generating audio.')
      return
    }

    if (!contentHash) {
      setStatusMessage('Computing content hash...')
      return
    }

    setIsGenerating(true)
    setStatusMessage(null)
    try {
      // Use hash-based endpoint for stable audio naming
      const response = await fetch(`${API_BASE_URL}/api/tts/${presentationId}/audio/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: commentText,
          content_hash: contentHash,
          voice: voice,
          speed: speed,
        }),
      })

      const data = await response.json()

      if (data.success && data.audio_url) {
        const resolvedUrl = data.audio_url.startsWith('http')
          ? data.audio_url
          : `${API_BASE_URL}${data.audio_url}`
        const cacheBustedUrl = resolvedUrl.includes('?')
          ? `${resolvedUrl}&t=${Date.now()}`
          : `${resolvedUrl}?t=${Date.now()}`
        setAudioUrl(cacheBustedUrl)
        setAudioAvailable(true)
        onAudioGenerated?.(resolvedUrl)
        setStatusMessage('Audio ready.')
      } else {
        setStatusMessage(data.message || 'Failed to generate audio.')
      }
    } catch (error) {
      console.error('Failed to generate audio:', error)
      setStatusMessage('Failed to generate audio. Make sure the TTS service is available.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreviewVoice = async () => {
    if (previewPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.currentTime = 0
      setPreviewPlaying(false)
      return
    }

    setPreviewLoading(true)
    try {
      const previewUrl = `${API_BASE_URL}/api/tts/preview/${voice}`

      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio()
        previewAudioRef.current.onended = () => setPreviewPlaying(false)
        previewAudioRef.current.onerror = () => {
          setPreviewPlaying(false)
          setStatusMessage('Failed to load voice preview')
        }
      }

      previewAudioRef.current.src = previewUrl
      await previewAudioRef.current.play()
      setPreviewPlaying(true)
    } catch (error) {
      console.error('Failed to play voice preview:', error)
      setStatusMessage('Failed to play voice preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showOptions && (
        <>
          <div className="flex items-center gap-1">
            <Select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-36 text-sm"
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
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePreviewVoice}
              disabled={previewLoading}
              className="h-8 w-8 p-0"
              title="Preview this voice"
            >
              {previewLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : previewPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          <Select
            value={speed.toString()}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-24 text-sm"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1.0">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2.0x</option>
          </Select>
        </>
      )}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setShowOptions(!showOptions)}
        className="text-xs"
      >
        {showOptions ? 'Hide' : 'Options'}
      </Button>
      <Button
        size="sm"
        onClick={handleGenerateAudio}
        disabled={isGenerating || !presentationId || !commentText?.trim()}
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4" />
            Generate Audio
          </>
        )}
      </Button>
      {audioUrl && (
        <audio controls src={audioUrl} className="w-full max-w-xs mt-1">
          Your browser does not support the audio element.
        </audio>
      )}
      {statusMessage && (
        <p className="text-xs text-slate-600">{statusMessage}</p>
      )}
      {audioAvailable && (
        <p className="text-xs text-emerald-600">
          Audio available
        </p>
      )}
    </div>
  )
}
