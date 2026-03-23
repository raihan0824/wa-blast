export interface Contact {
  name: string;
  number: string;
}

export interface UploadResult {
  contacts: Contact[];
  totalRows: number;
  errors: string[];
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function startBlast(contacts: Contact[], template: string) {
  const res = await fetch('/api/blast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contacts, template }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Blast failed');
  }
  return res.json();
}
