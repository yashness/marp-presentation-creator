interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border',
    md: 'h-12 w-12 border-b-2',
    lg: 'h-16 w-16 border-b-2',
  }

  return (
    <div className="h-full flex items-center justify-center">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-primary-600`} />
    </div>
  )
}
