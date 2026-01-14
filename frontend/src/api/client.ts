const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Presentation {
  id: string;
  title: string;
  content: string;
  theme_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePresentation {
  title: string;
  content: string;
  theme_id?: string | null;
}

export async function fetchPresentations(): Promise<Presentation[]> {
  const response = await fetch(`${API_BASE_URL}/api/presentations`);
  if (!response.ok) throw new Error('Failed to fetch presentations');
  return response.json();
}

export async function createPresentation(data: CreatePresentation): Promise<Presentation> {
  const response = await fetch(`${API_BASE_URL}/api/presentations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create presentation');
  return response.json();
}

export async function getPresentation(id: string): Promise<Presentation> {
  const response = await fetch(`${API_BASE_URL}/api/presentations/${id}`);
  if (!response.ok) throw new Error('Failed to fetch presentation');
  return response.json();
}

export async function updatePresentation(id: string, data: Partial<CreatePresentation>): Promise<Presentation> {
  const response = await fetch(`${API_BASE_URL}/api/presentations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update presentation');
  return response.json();
}

export async function deletePresentation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/presentations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete presentation');
}

export async function getPreview(id: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/presentations/${id}/preview`);
  if (!response.ok) throw new Error('Failed to get preview');
  return response.text();
}
