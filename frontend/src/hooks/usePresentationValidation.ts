export function usePresentationValidation() {
  function validateTitleAndContent(title: string, content: string): string | null {
    if (!title || !content) {
      return 'Please enter title and content'
    }
    return null
  }

  function validateCreate(title: string, content: string): string | null {
    return validateTitleAndContent(title, content)
  }

  function validateUpdate(id: string | null, title: string, content: string): string | null {
    if (!id) {
      return 'No presentation selected'
    }
    return validateTitleAndContent(title, content)
  }

  return {
    validateCreate,
    validateUpdate,
  }
}
