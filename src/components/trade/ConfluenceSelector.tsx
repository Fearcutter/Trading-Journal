import Checkbox from '../ui/Checkbox';

interface ConfluenceSelectorProps {
  available: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function ConfluenceSelector({ available, selected, onChange }: ConfluenceSelectorProps) {
  const toggle = (confluence: string) => {
    if (selected.includes(confluence)) {
      onChange(selected.filter(c => c !== confluence));
    } else {
      onChange([...selected, confluence]);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-300">Confluences</label>
      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/50 border border-slate-600 rounded-lg max-h-48 overflow-y-auto">
        {available.map(c => (
          <Checkbox
            key={c}
            label={c}
            checked={selected.includes(c)}
            onCheckedChange={() => toggle(c)}
          />
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-slate-500">{selected.length} confluence{selected.length !== 1 ? 's' : ''} selected</p>
      )}
    </div>
  );
}
