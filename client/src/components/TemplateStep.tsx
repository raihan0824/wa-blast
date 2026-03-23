import { useState, useRef } from 'react';
import type { Contact } from '../lib/api';

interface TemplateStepProps {
  contacts: Contact[];
  onNext: (template: string) => void;
  onBack: () => void;
}

export function TemplateStep({ contacts, onNext, onBack }: TemplateStepProps) {
  const [template, setTemplate] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const preview = contacts.length > 0
    ? template.replace(/\{name\}/g, contacts[0].name)
    : template;

  const insertName = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newVal = template.slice(0, start) + '{name}' + template.slice(end);
    setTemplate(newVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 6, start + 6);
    }, 0);
  };

  const isValid = template.trim().length > 0 && template.includes('{name}');

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold text-gray-800">Message Template</h2>
      <p className="text-gray-500">
        Write your message. Use <code className="bg-gray-100 px-1.5 py-0.5 rounded text-green-700 text-sm">{'{name}'}</code> for the recipient's name.
      </p>

      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">Template</label>
          <button
            onClick={insertName}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            + Insert {'{name}'}
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="Hello {name}, we wanted to let you know..."
          rows={6}
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
        />
      </div>

      {template.trim() && (
        <div className="w-full max-w-lg bg-gray-50 border rounded-lg p-4 text-left">
          <p className="text-sm font-medium text-gray-500 mb-2">
            Preview (for {contacts[0]?.name ?? 'Recipient'}):
          </p>
          <p className="text-gray-800 whitespace-pre-wrap">{preview}</p>
        </div>
      )}

      {template.trim() && !template.includes('{name}') && (
        <p className="text-amber-600 text-sm">
          Tip: Add {'{name}'} to personalize the message for each recipient.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onNext(template)}
          disabled={!isValid}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
