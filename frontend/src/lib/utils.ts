import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Presentation } from '../api/client'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function getMostRecentPresentation(presentations: Presentation[]): Presentation | undefined {
  return [...presentations]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
}

export function toLocalDate(dateString: string): Date {
  if (!dateString) return new Date()
  const [datePart, timePart] = dateString.split('T')
  if (!datePart || !timePart) return new Date(dateString)

  const [year, month, day] = datePart.split('-').map(Number)
  const [timeSegment] = timePart.split('+') // strip timezone if any
  const [hms] = timeSegment.split('.') // drop milliseconds
  const [hour = 0, minute = 0, second = 0] = hms.split(':').map(Number)

  return new Date(year, (month || 1) - 1, day || 1, hour, minute, second)
}

export function formatLocalDate(dateString: string): string {
  return toLocalDate(dateString).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}

export function extractIdFromSlug(slug: string): string {
  return slug.split('-').slice(-1)[0]
}

export function updateBrowserUrl(title: string, id: string): void {
  const slug = title ? createSlug(title) : 'presentation'
  window.history.replaceState({}, '', `/slides/${slug}-${id}`)
}

export function getSlugFromUrl(): string | null {
  const match = window.location.pathname.match(/\/slides\/([^/]+)$/)
  return match ? match[1] : null
}
