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

async function handleError(res: Response, fallback: string): Promise<never> {
  if (res.status === 401) {
    const { clearAuth } = await import('./auth');
    clearAuth();
    window.location.reload();
  }
  let message = fallback;
  try {
    const err = await res.json();
    message = err.error || fallback;
  } catch {
    // Response wasn't JSON (e.g. HTML from catch-all)
  }
  throw new Error(message);
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) await handleError(res, 'Upload failed');
  return res.json();
}

export async function startBlast(contacts: Contact[], template: string) {
  const res = await fetch('/api/blast', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ contacts, template }),
  });
  if (!res.ok) await handleError(res, 'Blast failed');
  return res.json();
}

// Template CRUD
export async function getTemplates(): Promise<SavedTemplate[]> {
  const res = await fetch('/api/template', { headers: authHeaders() });
  if (!res.ok) await handleError(res, 'Failed to load templates');
  return res.json();
}

export async function createTemplate(name: string, body: string): Promise<SavedTemplate> {
  const res = await fetch('/api/template', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, body }),
  });
  if (!res.ok) await handleError(res, 'Failed to create template');
  return res.json();
}

export async function deleteTemplate(id: number): Promise<void> {
  const res = await fetch(`/api/template/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) await handleError(res, 'Failed to delete template');
}

// WA contact search
export interface WAContact {
  jid: string;
  name: string;
  number: string;
}

export async function searchWAContacts(query: string): Promise<{ results: WAContact[]; totalSynced: number }> {
  if (!query || query.length < 2) return { results: [], totalSynced: 0 };
  const res = await fetch(`/api/wa-contacts?q=${encodeURIComponent(query)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return { results: [], totalSynced: 0 };
  return res.json();
}

// Blast history
export async function getHistory(): Promise<BlastHistorySummary[]> {
  const res = await fetch('/api/history', { headers: authHeaders() });
  if (!res.ok) await handleError(res, 'Failed to load history');
  return res.json();
}

export async function getHistoryDetail(id: number): Promise<{ blast: BlastHistorySummary; recipients: BlastRecipientDetail[] }> {
  const res = await fetch(`/api/history/${id}`, { headers: authHeaders() });
  if (!res.ok) await handleError(res, 'Failed to load blast details');
  return res.json();
}
