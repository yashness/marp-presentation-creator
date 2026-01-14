import { useToast } from '../components/ui/toast'

export function useApiHandler() {
  const { showToast } = useToast()

  async function handleApiCall<T>(
    operation: () => Promise<T>,
    successMessage: string,
    errorMessage: string,
  ): Promise<T | null> {
    try {
      const result = await operation()
      showToast(successMessage, 'success')
      return result
    } catch (error) {
      showToast(errorMessage, 'error')
      return null
    }
  }

  return { handleApiCall }
}
