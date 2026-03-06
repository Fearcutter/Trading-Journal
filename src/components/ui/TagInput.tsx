import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  label?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

export default function TagInput({ label, tags, onChange, placeholder = 'Add tag...', suggestions = [] }: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      <div className="relative">
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-800 border border-slate-600 rounded-lg min-h-[42px]">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-slate-200 text-xs rounded-md"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 hover:text-slate-200">
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[80px] bg-transparent text-sm text-slate-50 placeholder-slate-500 outline-none"
          />
        </div>
        {showSuggestions && input && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 max-h-32 overflow-y-auto">
            {filteredSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => addTag(s)}
                className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
