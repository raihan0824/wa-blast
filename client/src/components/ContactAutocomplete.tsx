import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { searchWAContacts, type WAContact } from '../lib/api';

interface ContactAutocompleteProps {
  value: string;
  onChange: (number: string) => void;
  placeholder?: string;
}

export function ContactAutocomplete({ value, onChange, placeholder = 'Search name or type 628...' }: ContactAutocompleteProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [results, setResults] = useState<WAContact[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [totalSynced, setTotalSynced] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Sync external value changes
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const updateDropdownPos = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  const isNumericInput = (text: string) => /^[\d+\s\-().]*$/.test(text);

  const handleChange = (text: string) => {
    setDisplayValue(text);
    setSelectedIndex(-1);

    if (isNumericInput(text)) {
      // Direct number entry — pass through, no search
      onChange(text);
      setIsOpen(false);
      setResults([]);
      return;
    }

    // Name search — debounce API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (text.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      updateDropdownPos();
      try {
        const data = await searchWAContacts(text);
        setResults(data.results);
        setTotalSynced(data.totalSynced);
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const selectContact = (contact: WAContact) => {
    onChange(contact.number);
    setDisplayValue(contact.number);
    setIsOpen(false);
    setResults([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectContact(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleFocus = () => {
    if (!isNumericInput(displayValue) && displayValue.length >= 2) {
      updateDropdownPos();
      if (results.length > 0) setIsOpen(true);
    }
  };

  const dropdown = isOpen && (results.length > 0 || loading) && createPortal(
    <div
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto"
      style={{ top: dropdownPos.top, left: dropdownPos.left, width: Math.max(dropdownPos.width, 280) }}
    >
      {loading && (
        <div className="px-3 py-2 text-sm text-gray-400">Searching...</div>
      )}
      {!loading && results.length === 0 && (
        <div className="px-3 py-2 text-sm text-gray-400">
          No contacts found{totalSynced === 0 ? ' (contacts not synced yet)' : ''}
        </div>
      )}
      {results.map((contact, i) => (
        <button
          key={contact.jid}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center justify-between gap-2 ${
            i === selectedIndex ? 'bg-green-50' : ''
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            selectContact(contact);
          }}
        >
          <span className="text-gray-700 truncate">{contact.name || '(no name)'}</span>
          <span className="text-gray-400 font-mono text-xs shrink-0">{contact.number}</span>
        </button>
      ))}
    </div>,
    document.body
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className={`w-full border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-green-500 ${
          !value ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'
        }`}
        placeholder={placeholder}
      />
      {dropdown}
    </div>
  );
}
