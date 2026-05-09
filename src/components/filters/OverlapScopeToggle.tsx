export type OverlapScope = 'exclude' | 'include';

interface OverlapScopeToggleProps {
  value: OverlapScope;
  onChange: (next: OverlapScope) => void;
}

export default function OverlapScopeToggle({ value, onChange }: OverlapScopeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange('exclude')}
        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
          value === 'exclude' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'
        }`}
      >
        Exclude overlaps
      </button>
      <button
        onClick={() => onChange('include')}
        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
          value === 'include' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'
        }`}
      >
        Include overlaps
      </button>
    </div>
  );
}
