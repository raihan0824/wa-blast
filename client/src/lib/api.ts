import { getToken } from './auth';

export interface Contact {
  number: string;
  [key: string]: string;
}

export interface UploadResult {
  contacts: Contact[];
  columns: string[];
  totalRows: number;
  errors: string[];
}

export interface SavedTemplate {
  id: number;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface BlastHistorySummary {
  id: number;
  template: string;
  total: number;
  sent: number;
  failed: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export interface BlastRecipientDetail {
  id: number;
  number: string;
  variables: Record<string, string>;
  rendered_message: string | null;
  status: string;
  error: string | null;
  sent_at: string | null;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function startBlast(contacts: Contact[], template: string) {
  const res = await fetch('/api/blast', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ contacts, template }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Blast failed');
  }
  return res.json();
}

// Template CRUD
export async function getTemplates(): Promise<SavedTemplate[]> {
  const res = await fetch('/api/template', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load templates');
  return res.json();
}

export async function createTemplate(name: string, body: string): Promise<SavedTemplate> {
  const res = await fetch('/api/template', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, body }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create template');
  }
  return res.json();
}

export async function deleteTemplate(id: number): Promise<void> {
  const res = await fetch(`/api/template/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete template');
}

// Blast history
export async function getHistory(): Promise<BlastHistorySummary[]> {
  const res = await fetch('/api/history', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function getHistoryDetail(id: number): Promise<{ blast: BlastHistorySummary; recipients: BlastRecipientDetail[] }> {
  const res = await fetch(`/api/history/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load blast details');
  return res.json();
}
