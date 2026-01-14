export function usePresentationValidation() {
  function validateCreate(title: string, content: string): string | null {
    if (!title || !content) {
      return 'Please enter title and content'
    }
    return null
  }

  function validateUpdate(id: string | null, title: string, content: string): string | null {
    if (!id) {
      return 'No presentation selected'
    }
    if (!title || !content) {
      return 'Please enter title and content'
    }
    return null
  }

  return {
    validateCreate,
    validateUpdate,
  }
}
