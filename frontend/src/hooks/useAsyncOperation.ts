import { useState, useCallback } from 'react'

export function useAsyncOperation<T extends (...args: any[]) => Promise<any>>(
  operation: T
): [T, boolean] {
  const [loading, setLoading] = useState(false)

  const wrappedOperation = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      setLoading(true)
      try {
        return await operation(...args)
      } finally {
        setLoading(false)
      }
    },
    [operation]
  ) as T

  return [wrappedOperation, loading]
}
