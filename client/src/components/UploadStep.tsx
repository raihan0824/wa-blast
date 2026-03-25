import { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile, type Contact } from '../lib/api';
import { ContactAutocomplete } from './ContactAutocomplete';

interface UploadStepProps {
  onNext: (contacts: Contact[], columns: string[]) => void;
  onBack: () => void;
  initialContacts?: Contact[];
  initialColumns?: string[];
  onChange?: (contacts: Contact[], columns: string[]) => void;
}

export function UploadStep({ onNext, onBack, initialContacts, initialColumns, onChange }: UploadStepProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts ?? []);
  const [columns, setColumns] = useState<string[]>(initialColumns ?? ['name']);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');

  // Sync edits to parent so sidebar navigation doesn't lose data
  useEffect(() => {
    onChangeRef.current?.(contacts, columns);
  }, [contacts, columns]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDrop: async (files) => {
      if (files.length === 0) return;
      const file = files[0];
      setLoading(true);
      setErrors([]);
      setFileName(file.name);
      try {
        const result = await uploadFile(file);
        setContacts(result.contacts);
        setErrors(result.errors);
        if (result.columns.length > 0) {
          setColumns(result.columns);
        }
      } catch (err: unknown) {
        setErrors([err instanceof Error ? err.message : 'Upload failed']);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    },
  });

  const addColumn = () => {
    const name = newColumnName.trim().toLowerCase();
    if (!name || name === 'number' || columns.includes(name)) return;
    setColumns([...columns, name]);
    setContacts(contacts.map((c) => ({ ...c, [name]: '' })));
    setNewColumnName('');
  };

  const removeColumn = (col: string) => {
    setColumns(columns.filter((c) => c !== col));
    setContacts(contacts.map((c) => {
      const { [col]: _, ...rest } = c;
      return rest as Contact;
    }));
  };

  const addRow = () => {
    const newContact: Contact = { number: '' };
    for (const col of columns) {
      newContact[col] = '';
    }
    setContacts([...contacts, newContact]);
  };

  const removeRow = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateCell = (index: number, key: string, value: string) => {
    setContacts(prev => prev.map((c, i) => i === index ? { ...c, [key]: value } : c));
  };

  const validContacts = contacts.filter((c) => c.number.trim().length > 0);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-gray-500">
        Upload a CSV/Excel file with contacts, or add them manually. The number column is optional — you can search WhatsApp contacts to fill in numbers.
      </p>

      <div
        {...getRootProps()}
        className={`w-full max-w-lg border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
          isDragActive
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <div className="text-3xl mb-2">📁</div>
          {loading ? (
            <p className="text-gray-500">Processing file...</p>
          ) : fileName ? (
            <p className="text-gray-700 font-medium">{fileName}</p>
          ) : (
            <>
              <p className="text-gray-600 font-medium">Drop your file here</p>
              <p className="text-gray-400 text-sm mt-1">or click to browse (.csv, .xlsx, .xls)</p>
            </>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="w-full max-w-2xl bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
          <p className="text-amber-700 font-medium mb-1">Warnings:</p>
          <ul className="text-amber-600 text-sm list-disc list-inside">
            {errors.slice(0, 10).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {errors.length > 10 && (
              <li>...and {errors.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Column manager */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Columns</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addColumn()}
              placeholder="New column..."
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={addColumn}
              disabled={!newColumnName.trim() || newColumnName.trim().toLowerCase() === 'number' || columns.includes(newColumnName.trim().toLowerCase())}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + Add
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">number</span>
          {columns.map((col) => (
            <span key={col} className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium flex items-center gap-1.5">
              {col}
              <button
                onClick={() => removeColumn(col)}
                className="text-green-400 hover:text-red-500 transition-colors"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Contact table */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">
            {validContacts.length} valid contact{validContacts.length !== 1 ? 's' : ''}
            {contacts.length !== validContacts.length && ` (${contacts.length} total)`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const allCols = ['number', ...columns];
                const header = allCols.join(',');
                const rows = contacts.map((c) =>
                  allCols.map((col) => {
                    const val = (col === 'number' ? c.number : c[col]) || '';
                    return val.includes(',') || val.includes('"') || val.includes('\n')
                      ? `"${val.replace(/"/g, '""')}"` : val;
                  }).join(',')
                );
                const csv = [header, ...rows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'contacts.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={contacts.length === 0}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={addRow}
              className="px-3 py-1.5 border border-green-300 text-green-600 text-sm rounded-lg font-medium hover:bg-green-50 transition-colors"
            >
              + Add Row
            </button>
          </div>
        </div>

        {contacts.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-gray-600 w-10">#</th>
                    <th className="px-3 py-2 text-gray-600">Number</th>
                    {columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-gray-600 capitalize">{col}</th>
                    ))}
                    <th className="px-3 py-2 text-gray-600 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1.5">
                        <ContactAutocomplete
                          value={c.number}
                          onChange={(num) => updateCell(i, 'number', num)}
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col} className="px-3 py-1.5">
                          <input
                            type="text"
                            value={c[col] || ''}
                            onChange={(e) => updateCell(i, col, e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => removeRow(i)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {contacts.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
            No contacts yet. Upload a file or add rows manually.
          </div>
        )}
      </div>

      {contacts.length > 0 && validContacts.length < contacts.length && (
        <div className="w-full max-w-2xl bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          {contacts.length - validContacts.length} contact{contacts.length - validContacts.length !== 1 ? 's are' : ' is'} missing a number. Click the number cell to search WhatsApp contacts or type a number directly.
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onNext(validContacts, columns)}
          disabled={validContacts.length === 0}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
