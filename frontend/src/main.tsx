import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const queryClient = new QueryClient()

if (!PUBLISHABLE_KEY) {
  console.warn('Missing Clerk Publishable Key - Auth features will be disabled')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        {PUBLISHABLE_KEY ? (
          <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
            <App />
          </ClerkProvider>
        ) : (
          <App />
        )}
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)
