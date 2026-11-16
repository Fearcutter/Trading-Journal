import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/** Choose which confluences the analysis looks at. Hidden ones keep their data. */
export default function ConfluencePicker({ forNames, againstNames, hidden, onChange }: {
  forNames: string[];
  againstNames: string[];
  hidden: Set<string>;
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const all = [...forNames, ...againstNames];
  const shown = all.filter(n => !hidden.has(n)).length;
  const toggle = (name: string) => {
    const next = new Set(hidden);
    if (next.has(name)) next.delete(name); else next.add(name);
    onChange([...next]);
  };
  const setGroup = (names: string[], show: boolean) => {
    const next = new Set(hidden);
    for (const n of names) { if (show) next.delete(n); else next.add(n); }
    onChange([...next]);
  };

  const group = (title: string, names: string[]) => names.length > 0 && (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        <button onClick={() => setGroup(names, true)} className="text-xs text-sky-300 hover:underline">All</button>
        <button onClick={() => setGroup(names, false)} className="text-xs text-slate-500 hover:text-slate-300 hover:underline">None</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {names.map(n => {
          const on = !hidden.has(n);
          return (
            <button
              key={n}
              onClick={() => toggle(n)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                on ? 'bg-blue-600/20 border-blue-500/50 text-blue-200' : 'bg-transparent border-slate-700 text-slate-500 line-through'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (all.length === 0) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-50">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Confluences to look at: {shown === all.length ? `all ${all.length}` : `${shown} of ${all.length}`}
      </button>
      {open && (
        <>
          <p className="text-xs text-slate-500">
            Click to turn one off or on. Turned-off confluences are left out of every table below, as if you hadn't tagged them; the data stays on your trades. Remembered for next time.
          </p>
          {group('For', forNames)}
          {group('Against', againstNames)}
        </>
      )}
    </div>
  );
}
