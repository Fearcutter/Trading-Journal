import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/** The exact numbers behind a chart, folded away until asked for. */
export default function ShowNumbers({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {open ? 'Hide the numbers' : 'Show the numbers'}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
