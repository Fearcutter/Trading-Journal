import { useMemo, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import MultiSelect from '../ui/MultiSelect';
import Button from '../ui/Button';
import { useBacktest } from '../../context/BacktestContext';
import { useSettings } from '../../context/SettingsContext';

/** Choose backtest folders and sessions, and save a choice under a name to reuse it. */
export default function BacktestPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { sessions, folders } = useBacktest();
  const { backtestGroups, updateSettings } = useSettings();
  const groups = useMemo(() => backtestGroups ?? [], [backtestGroups]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const options = useMemo(() => {
    const folderName = new Map(folders.map(f => [f.id, f.name]));
    const folderOpts = folders.map(f => ({
      value: f.id,
      label: `Folder: ${f.name}`,
      sublabel: `${sessions.filter(s => s.folderId === f.id).length} sessions`,
    }));
    const sessionOpts = [...sessions]
      .sort((a, b) => (folderName.get(a.folderId ?? '') ?? '').localeCompare(folderName.get(b.folderId ?? '') ?? '') || a.name.localeCompare(b.name))
      .map(s => ({ value: s.id, label: s.folderId && folderName.has(s.folderId) ? `${folderName.get(s.folderId)} · ${s.name}` : s.name }));
    return [...folderOpts, ...sessionOpts];
  }, [folders, sessions]);

  const same = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));
  const current = groups.find(g => same(g.ids, value));

  const save = () => {
    const n = name.trim();
    if (!n || value.length === 0) return;
    const existing = groups.find(g => g.name.toLowerCase() === n.toLowerCase());
    const next = existing
      ? groups.map(g => (g.id === existing.id ? { ...g, ids: value } : g))
      : [...groups, { id: crypto.randomUUID(), name: n, ids: value }];
    updateSettings({ backtestGroups: next });
    setNaming(false);
    setName('');
  };

  return (
    <div className="flex items-end gap-2 flex-wrap">
      {groups.length > 0 && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">Saved groups</label>
          <select
            value={current?.id ?? ''}
            onChange={e => onChange(groups.find(g => g.id === e.target.value)?.ids ?? [])}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{value.length ? 'Custom pick' : 'All backtests'}</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}
      <div className="min-w-56">
        <MultiSelect label="Backtest folders / sessions" value={value} onChange={onChange} options={options} placeholder="All backtests" />
      </div>
      {current ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => { if (confirm(`Delete the saved group "${current.name}"? Your trades aren't affected.`)) updateSettings({ backtestGroups: groups.filter(g => g.id !== current.id) }); }}
        >
          <Trash2 size={14} /> Delete group
        </Button>
      ) : value.length > 0 && (naming ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setNaming(false); }}
            placeholder="Group name"
            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button size="sm" onClick={save} disabled={!name.trim()}>Save</Button>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setNaming(true)}><Save size={14} /> Save as group</Button>
      ))}
    </div>
  );
}
