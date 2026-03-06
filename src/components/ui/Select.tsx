import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption { value: string; label: string; }
interface SelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export default function Select({ label, value, onValueChange, options, placeholder = 'Select...' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label;

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      <div className="relative" ref={containerRef}>
        <button type="button" onClick={() => setOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <span className={displayLabel == null ? 'text-slate-500' : ''}>
            {displayLabel ?? placeholder}
          </span>
          <ChevronDown size={16} className="text-slate-400" />
        </button>
        {open && (
          <ul className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden p-1">
            {options.map(opt => (
              <li key={opt.value === '' ? '__empty__' : opt.value}
                onClick={() => { onValueChange(opt.value); setOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 rounded-md cursor-pointer hover:bg-slate-700">
                <span className="w-3.5 flex-shrink-0">
                  {opt.value === value && <Check size={14} className="text-blue-400" />}
                </span>
                <span>{opt.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
