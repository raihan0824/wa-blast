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

export interface BlastProgress {
  sent: number;
  failed: number;
  total: number;
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

export type WAStatus = 'disconnected' | 'qr_pending' | 'connected' | 'error';
