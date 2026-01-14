import { Button } from './ui/button'
import { FileDown } from 'lucide-react'

interface ExportButtonProps {
  format: 'pdf' | 'html' | 'pptx'
  onClick: (format: 'pdf' | 'html' | 'pptx') => void
  disabled: boolean
}

export function ExportButton({ format, onClick, disabled }: ExportButtonProps) {
  return (
    <Button onClick={() => onClick(format)} variant="outline" disabled={disabled}>
      <FileDown className="w-4 h-4" />
      {format.toUpperCase()}
    </Button>
  )
}
