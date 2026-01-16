import { useState } from 'react'
import { Button } from './ui/button'
import { FileDown, Loader2, Check } from 'lucide-react'

interface ExportButtonProps {
  format: 'pdf' | 'html' | 'pptx'
  onClick: (format: 'pdf' | 'html' | 'pptx') => Promise<void> | void
  disabled: boolean
}

export function ExportButton({ format, onClick, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleClick = async () => {
    setIsExporting(true)
    try {
      await onClick(format)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      disabled={disabled || isExporting}
      className="min-w-[80px]"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : showSuccess ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      {format.toUpperCase()}
    </Button>
  )
}
