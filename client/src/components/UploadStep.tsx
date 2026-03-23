import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile, type Contact } from '../lib/api';

interface UploadStepProps {
  onNext: (contacts: Contact[]) => void;
  onBack: () => void;
}

export function UploadStep({ onNext, onBack }: UploadStepProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

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
      } catch (err: unknown) {
        setErrors([err instanceof Error ? err.message : 'Upload failed']);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold text-gray-800">Upload Contacts</h2>
      <p className="text-gray-500">
        Upload a CSV or Excel file with <strong>name</strong> and <strong>number</strong> columns
      </p>

      <div
        {...getRootProps()}
        className={`w-full max-w-lg border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${
          isDragActive
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <div className="text-4xl mb-3">📁</div>
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
        <div className="w-full max-w-lg bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
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

      {contacts.length > 0 && (
        <div className="w-full max-w-lg">
          <p className="text-green-600 font-medium mb-3">
            {contacts.length} valid contact{contacts.length !== 1 ? 's' : ''} found
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-gray-600">#</th>
                  <th className="px-4 py-2 text-gray-600">Name</th>
                  <th className="px-4 py-2 text-gray-600">Number</th>
                </tr>
              </thead>
              <tbody>
                {contacts.slice(0, 5).map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2 font-mono text-gray-600">{c.number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contacts.length > 5 && (
              <p className="text-gray-400 text-sm p-3 border-t">
                ...and {contacts.length - 5} more
              </p>
            )}
          </div>
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
          onClick={() => onNext(contacts)}
          disabled={contacts.length === 0}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
