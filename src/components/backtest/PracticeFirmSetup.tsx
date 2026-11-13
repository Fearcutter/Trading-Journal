import { useState } from 'react';
import Button from '../ui/Button';
import { usePropFirms, firmLabel } from './usePropFirms';
import type { BacktestSession } from '../../types/backtest';
import type { FirmConfig } from '../../utils/prop-ev';

/** Turn a plain folder into a prop firm practice folder. */
export default function PracticeFirmSetup({ folder, onSave }: { folder: BacktestSession; onSave: (firmRules: FirmConfig, attemptGoal: number) => void }) {
  const firms = usePropFirms();
  const [firmId, setFirmId] = useState('');
  const firm = firms.find(f => f.id === firmId);

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
      <span className="text-slate-400">Practice a prop firm in this folder:</span>
      <select
        value={firmId}
        onChange={e => setFirmId(e.target.value)}
        className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Pick a firm…</option>
        {firms.map(f => <option key={f.id} value={f.id}>{firmLabel(f)}</option>)}
      </select>
      <Button size="sm" variant="secondary" disabled={!firm} onClick={() => firm && onSave(firm, folder.attemptGoal ?? 25)}>Set up</Button>
    </div>
  );
}
