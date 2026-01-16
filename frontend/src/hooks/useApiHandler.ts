import { useToast } from '../contexts/ToastContext'

export function useApiHandler() {
  const { showToast } = useToast()

  async function handleApiCall<T>(
    operation: () => Promise<T>,
    successMessage: string,
    errorMessage: string,
  ): Promise<T | null> {
    try {
      const result = await operation()
      if (successMessage) {
        showToast(successMessage, 'success')
      }
      return result
    } catch (error) {
      console.error('API operation failed:', error)
      showToast(errorMessage, 'error')
      return null
    }
  }

  return { handleApiCall }
}
