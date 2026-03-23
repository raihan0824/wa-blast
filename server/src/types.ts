export interface Contact {
  name: string;
  number: string;
}

export interface UploadResult {
  contacts: Contact[];
  totalRows: number;
  errors: string[];
}

export interface BlastProgress {
  sent: number;
  failed: number;
  total: number;
}

export type WAStatus = 'disconnected' | 'qr_pending' | 'connected' | 'error';
