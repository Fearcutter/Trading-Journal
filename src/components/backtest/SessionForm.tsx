import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useSettings } from '../../context/SettingsContext';
import type { FirmConfig } from '../../utils/prop-ev';
import { usePropFirms, firmLabel } from './usePropFirms';
import { COLOR_OPTIONS } from './colors';

export interface SessionFormValues {
  name: string;
  description: string;
  instrument?: string;
  color: string;
  /** Folder only. */
  firmRules?: FirmConfig;
  attemptGoal?: number;
}

/** New session, or new folder (optionally a practice folder with a firm's rules). */
export default function SessionForm({ kind, onCreate }: { kind: 'session' | 'folder'; onCreate: (v: SessionFormValues) => void }) {
  const settings = useSettings();
  const firms = usePropFirms();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instrument, setInstrument] = useState('');
  const [color, setColor] = useState('blue');
  const [firmId, setFirmId] = useState('');
  const [goal, setGoal] = useState('25');

  const firm = firms.find(f => f.id === firmId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || (firm ? `${firmLabel(firm)} practice` : '');
    if (!finalName) return;
    onCreate({
      name: finalName,
      description: description.trim(),
      instrument: instrument || undefined,
      color,
      ...(kind === 'folder' && firm ? { firmRules: firm, attemptGoal: Math.max(1, Math.round(Number(goal) || 25)) } : {}),
    });
  };

  return (
    <form onSubmit={submit} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={kind === 'folder' ? 'Folder Name' : 'Session Name'}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={kind === 'folder' ? (firm ? `${firmLabel(firm)} practice` : 'e.g. Lucid practice') : 'e.g. NQ Breakout Strategy'}
          required={!(kind === 'folder' && firm)}
        />
        {kind === 'session' ? (
          <Select
            label="Instrument (optional)"
            value={instrument}
            onValueChange={setInstrument}
            options={[{ value: '', label: 'Any Instrument' }, ...settings.instruments.map(i => ({ value: i.symbol, label: `${i.symbol} - ${i.name}` }))]}
          />
        ) : (
          <Select
            label="Practice a prop firm (optional)"
            value={firmId}
            onValueChange={setFirmId}
            options={[{ value: '', label: 'No firm: just a folder' }, ...firms.map(f => ({ value: f.id, label: firmLabel(f) }))]}
          />
        )}
      </div>
      {kind === 'folder' && firm && (
        <div className="grid grid-cols-2 gap-4 items-end">
          <Input label="How many attempts?" type="number" min={1} value={goal} onChange={e => setGoal(e.target.value)} />
          <p className="text-xs text-slate-500">
            The folder keeps its own copy of {firmLabel(firm)}'s rules from the Prop Firm EV page, so later edits there won't change this practice.
          </p>
        </div>
      )}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder={kind === 'folder' ? "What's this folder for?" : 'Describe what you\'re testing...'}
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Color</label>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.name}
              type="button"
              onClick={() => setColor(c.name)}
              className={`w-7 h-7 rounded-full ${c.bg} transition-all ${color === c.name ? `ring-2 ${c.ring} ring-offset-2 ring-offset-slate-800` : 'opacity-50 hover:opacity-75'}`}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm">{kind === 'folder' ? 'Create Folder' : 'Create Session'}</Button>
      </div>
    </form>
  );
}
