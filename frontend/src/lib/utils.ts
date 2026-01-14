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
