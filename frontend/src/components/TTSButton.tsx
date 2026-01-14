import { useState } from 'react'
import { Volume2, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Select } from './ui/select'

interface TTSButtonProps {
  presentationId: string | null
  slideIndex: number
  commentText: string
  onAudioGenerated?: (audioUrl: string) => void
}

export function TTSButton({ presentationId, slideIndex, commentText, onAudioGenerated }: TTSButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [voice, setVoice] = useState('af')
  const [speed, setSpeed] = useState(1.0)
  const [showOptions, setShowOptions] = useState(false)

  const handleGenerateAudio = async () => {
    if (!presentationId || !commentText || !commentText.trim()) {
      alert('Please add a comment first')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`http://localhost:8000/api/tts/${presentationId}/slides/${slideIndex}`, {
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
        onAudioGenerated?.(data.audio_url)
        alert('Audio generated successfully!')
      } else {
        alert(data.message || 'Failed to generate audio')
      }
    } catch (error) {
      console.error('Failed to generate audio:', error)
      alert('Failed to generate audio. Make sure the TTS service is available.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {showOptions && (
        <>
          <Select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-32 text-sm"
          >
            <option value="af">American Female</option>
            <option value="am">American Male</option>
            <option value="bf">British Female</option>
            <option value="bm">British Male</option>
            <option value="af_sarah">Sarah</option>
            <option value="am_adam">Adam</option>
            <option value="bf_emma">Emma</option>
            <option value="bm_george">George</option>
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
    </div>
  )
}
