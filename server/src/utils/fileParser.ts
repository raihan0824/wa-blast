import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DEFAULT_COUNTRY_CODE } from '../config.js';
import type { Contact, UploadResult } from '../types.js';

const NAME_ALIASES = ['name', 'nama', 'recipient', 'penerima'];
const NUMBER_ALIASES = ['number', 'phone', 'nomor', 'no hp', 'no_hp', 'nohp', 'telepon', 'hp'];

function findColumn(headers: string[], aliases: string[]): string | null {
  for (const header of headers) {
    const normalized = header.trim().toLowerCase();
    if (aliases.includes(normalized)) return header;
  }
  return null;
}

function normalizeNumber(raw: string): string {
  let num = String(raw).replace(/[\s\-\(\)\+\.]/g, '');
  if (num.startsWith('0')) {
    num = DEFAULT_COUNTRY_CODE + num.slice(1);
  }
  return num;
}

function validateNumber(num: string): boolean {
  return /^\d{10,15}$/.test(num);
}

function parseRows(rows: Record<string, string>[], headers: string[]): UploadResult {
  const nameCol = findColumn(headers, NAME_ALIASES);
  const numberCol = findColumn(headers, NUMBER_ALIASES);

  if (!nameCol || !numberCol) {
    const missing = [];
    if (!nameCol) missing.push('name');
    if (!numberCol) missing.push('number');
    return {
      contacts: [],
      totalRows: rows.length,
      errors: [`Missing required column(s): ${missing.join(', ')}. Found columns: ${headers.join(', ')}`],
    };
  }

  const contacts: Contact[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row[nameCol]?.trim();
    const rawNumber = row[numberCol]?.trim();

    if (!name || !rawNumber) {
      errors.push(`Row ${i + 2}: missing name or number`);
      continue;
    }

    const number = normalizeNumber(rawNumber);
    if (!validateNumber(number)) {
      errors.push(`Row ${i + 2}: invalid number "${rawNumber}"`);
      continue;
    }

    contacts.push({ name, number });
  }

  return { contacts, totalRows: rows.length, errors };
}

export function parseCSV(buffer: Buffer): UploadResult {
  const result = Papa.parse<Record<string, string>>(buffer.toString(), {
    header: true,
    skipEmptyLines: true,
  });

  const headers = result.meta.fields ?? [];
  return parseRows(result.data, headers);
}

export function parseExcel(buffer: Buffer): UploadResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

  if (data.length === 0) {
    return { contacts: [], totalRows: 0, errors: ['File is empty'] };
  }

  const headers = Object.keys(data[0]);
  return parseRows(data, headers);
}

export function parseFile(buffer: Buffer, filename: string): UploadResult {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'csv') return parseCSV(buffer);
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(buffer);
  return { contacts: [], totalRows: 0, errors: [`Unsupported file type: .${ext}`] };
}
