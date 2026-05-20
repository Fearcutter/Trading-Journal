import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectProps {
  label?: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
}

export default function MultiSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'All',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter(x => x !== v));
    else onChange([...value, v]);
  };

  const triggerLabel = (() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const match = options.find(o => o.value === value[0]);
      return match?.label ?? '1 selected';
    }
    return `${value.length} selected`;
  })();

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className={value.length === 0 ? 'text-slate-500' : ''}>{triggerLabel}</span>
          <ChevronDown size={16} className="text-slate-400" />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 min-w-full w-max bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto p-1">
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-700"
              >
                Clear selection
              </button>
            )}
            <ul>
              {options.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-500">No options</li>
              )}
              {options.map(opt => {
                const checked = value.includes(opt.value);
                return (
                  <li
                    key={opt.value}
                    onClick={() => toggle(opt.value)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 rounded-md cursor-pointer hover:bg-slate-700 whitespace-nowrap"
                  >
                    <span className="w-3.5 flex-shrink-0">
                      {checked && <Check size={14} className="text-blue-400" />}
                    </span>
                    <span>{opt.label}</span>
                    {opt.sublabel && (
                      <span className="ml-1 text-xs text-slate-500">{opt.sublabel}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
