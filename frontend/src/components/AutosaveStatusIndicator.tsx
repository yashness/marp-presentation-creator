import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

interface AutosaveStatusIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
}

export function AutosaveStatusIndicator({ status }: AutosaveStatusIndicatorProps) {
  if (status === 'saving') {
    return <Loader2 className="w-4 h-4 text-primary-600 animate-spin" aria-label="Saving..." />
  }
  if (status === 'error') {
    return <XCircle className="w-4 h-4 text-red-600" aria-label="Auto-save failed" />
  }
  if (status === 'saved') {
    return <CheckCircle2 className="w-4 h-4 text-secondary-700" aria-label="Saved" />
  }
  return null
}
