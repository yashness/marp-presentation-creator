import { Component, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="max-w-md p-8 bg-white rounded-lg shadow-lg border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            </div>
            <p className="text-gray-600 mb-4">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <pre className="mb-4 p-3 bg-gray-100 rounded text-sm overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleReset} className="w-full">
              Reload Application
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
