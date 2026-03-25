import { useState } from 'react';
import type { Contact } from '../lib/api';

interface PreviewStepProps {
  contacts: Contact[];
  columns: string[];
  template: string;
  onConfirm: () => void;
  onBack: () => void;
}

function renderMessage(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => variables[key] ?? match);
}

export function PreviewStep({ contacts, columns, template, onConfirm, onBack }: PreviewStepProps) {
  const [showModal, setShowModal] = useState(false);

  const estimatedSeconds = contacts.length * 2.25;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  return (
    <div className="flex flex-col items-center gap-4 md:gap-6">
      <p className="text-gray-500 text-sm md:text-base text-center">
        Review your messages before sending. {contacts.length} message{contacts.length !== 1 ? 's' : ''} will be sent.
        Estimated time: ~{estimatedMinutes} minute{estimatedMinutes !== 1 ? 's' : ''}.
      </p>

      <div className="w-full max-w-3xl border rounded-lg overflow-hidden -mx-4 sm:mx-0">
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-gray-600">#</th>
                <th className="px-3 py-2 text-gray-600">Number</th>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-gray-600 capitalize hidden sm:table-cell">{col}</th>
                ))}
                <th className="px-3 py-2 text-gray-600">Message Preview</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, i) => {
                const { number, ...variables } = c;
                return (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-gray-600 text-xs">{number}</td>
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 hidden sm:table-cell">{c[col] || ''}</td>
                    ))}
                    <td className="px-3 py-2 text-gray-700 max-w-[200px] md:max-w-xs truncate">
                      {renderMessage(template, variables)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3 w-full sm:w-auto">
        <button
          onClick={onBack}
          className="flex-1 sm:flex-initial px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          &larr; Back
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 sm:flex-initial px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Start Blast
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Blast</h3>
            <p className="text-gray-600 mb-4">
              You are about to send <strong>{contacts.length}</strong> message{contacts.length !== 1 ? 's' : ''}.
              This cannot be undone. Proceed?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  onConfirm();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Yes, Send All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
