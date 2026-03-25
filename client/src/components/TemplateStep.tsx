import { useState, useRef, useEffect } from 'react';
import type { Contact } from '../lib/api';
import { getTemplates, createTemplate, deleteTemplate, type SavedTemplate } from '../lib/api';

interface TemplateStepProps {
  contacts: Contact[];
  columns: string[];
  onNext: (template: string) => void;
  onBack: () => void;
  initialTemplate?: string;
  onTemplateChange?: (template: string) => void;
}

function renderPreview(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => variables[key] ?? match);
}

export function TemplateStep({ contacts, columns, onNext, onBack, initialTemplate, onTemplateChange }: TemplateStepProps) {
  const [template, setTemplate] = useState(initialTemplate ?? '');
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onTemplateChangeRef = useRef(onTemplateChange);
  onTemplateChangeRef.current = onTemplateChange;

  useEffect(() => {
    getTemplates().then(setSavedTemplates).catch(() => {});
  }, []);

  // Sync template edits to parent so sidebar navigation doesn't lose data
  useEffect(() => {
    onTemplateChangeRef.current?.(template);
  }, [template]);

  const firstContact = contacts[0] || {};
  const { number: _, ...previewVars } = firstContact;
  const preview = renderPreview(template, previewVars);

  const insertVariable = (varName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const tag = `{${varName}}`;
    const newVal = template.slice(0, start) + tag + template.slice(end);
    setTemplate(newVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSaveTemplate = async () => {
    if (!saveName.trim() || !template.trim()) return;
    try {
      const t = await createTemplate(saveName.trim(), template);
      setSavedTemplates([t, ...savedTemplates]);
      setSaveName('');
      setShowSave(false);
    } catch {
      // ignore
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await deleteTemplate(id);
      setSavedTemplates(savedTemplates.filter((t) => t.id !== id));
    } catch {
      // ignore
    }
  };

  const handleLoadTemplate = (body: string) => {
    setTemplate(body);
  };

  const isValid = template.trim().length > 0;

  return (
    <div className="flex flex-col items-center gap-4 md:gap-6">
      <p className="text-gray-500 text-sm md:text-base text-center">
        Write your message. Use variable tags to personalize for each recipient.
      </p>

      {/* Saved templates */}
      {savedTemplates.length > 0 && (
        <div className="w-full max-w-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Saved Templates</p>
          <div className="flex flex-wrap gap-2">
            {savedTemplates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm group"
              >
                <button
                  onClick={() => handleLoadTemplate(t.body)}
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  {t.name}
                </button>
                <button
                  onClick={() => handleDeleteTemplate(t.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">Template</label>
          <button
            onClick={() => setShowSave(!showSave)}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            {showSave ? 'Cancel' : 'Save as template'}
          </button>
        </div>

        {showSave && (
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
              placeholder="Template name..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSaveTemplate}
              disabled={!saveName.trim() || !template.trim()}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              Save
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="Hello {name}, we wanted to let you know..."
          rows={6}
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
        />

        {/* Variable insertion buttons */}
        <div className="flex flex-wrap gap-2 mt-2">
          {columns.map((col) => (
            <button
              key={col}
              onClick={() => insertVariable(col)}
              className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium hover:bg-green-100 transition-colors border border-green-200"
            >
              + {`{${col}}`}
            </button>
          ))}
        </div>
      </div>

      {template.trim() && (
        <div className="w-full max-w-lg bg-gray-50 border rounded-lg p-3 md:p-4 text-left">
          <p className="text-sm font-medium text-gray-500 mb-2">
            Preview (for {firstContact.name || firstContact.number || 'Recipient'}):
          </p>
          <p className="text-gray-800 whitespace-pre-wrap text-sm md:text-base">{preview}</p>
        </div>
      )}

      <div className="flex gap-3 w-full sm:w-auto">
        <button
          onClick={onBack}
          className="flex-1 sm:flex-initial px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          &larr; Back
        </button>
        <button
          onClick={() => onNext(template)}
          disabled={!isValid}
          className="flex-1 sm:flex-initial px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
