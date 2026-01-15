import { useState } from 'react'
import { Volume2, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Select } from './ui/select'
import { API_BASE_URL } from '../lib/constants'

interface TTSButtonProps {
  presentationId: string | null
  slideIndex: number
  commentText: string
  onAudioGenerated?: (audioUrl: string) => void
}

export function TTSButton({ presentationId, slideIndex, commentText, onAudioGenerated }: TTSButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [voice, setVoice] = useState('af_bella')
  const [speed, setSpeed] = useState(1.0)
  const [showOptions, setShowOptions] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleGenerateAudio = async () => {
    if (!presentationId || !commentText || !commentText.trim()) {
      setStatusMessage('Add a slide comment before generating audio.')
      return
    }

    setIsGenerating(true)
    setStatusMessage(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/tts/${presentationId}/slides/${slideIndex}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: commentText,
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showOptions && (
        <>
          <Select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-40 text-sm"
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
    </div>
  )
}
