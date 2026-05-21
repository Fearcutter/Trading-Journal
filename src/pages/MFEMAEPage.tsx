import { useState, useMemo } from 'react';
import { useTrades } from '../context/TradeContext';
import { useApexAccounts } from '../context/ApexAccountContext';
import { useMFEMAEStats } from '../hooks/useMFEMAEStats';
import { usePLFormatter } from '../hooks/usePLFormatter';
import MFEMAEPanel from '../components/analytics/MFEMAEPanel';
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
import MultiSelect, { type MultiSelectOption } from '../components/ui/MultiSelect';

export default function MFEMAEPage() {
  const { trades } = useTrades();
  const { accounts } = useApexAccounts();
  const { plField } = usePLFormatter();
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const overlapScopedTrades = useMemo(
    () => overlapScope === 'exclude' ? trades.filter(t => !t.overlap) : trades,
    [trades, overlapScope]
  );

  const accountScopedTrades = useMemo(() => {
    if (selectedAccountIds.length === 0) return overlapScopedTrades;
    return overlapScopedTrades.filter(t =>
      t.accountIds?.some(id => selectedAccountIds.includes(id))
    );
  }, [overlapScopedTrades, selectedAccountIds]);

  const accountOptions: MultiSelectOption[] = useMemo(() => {
    const STATUS_ORDER: Record<string, number> = { active: 0, blown: 1, completed: 2 };
    const formatSize = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));
    return [...accounts]
      .sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.label.localeCompare(b.label);
      })
      .map(a => ({
        value: a.id,
        label: `${formatSize(a.accountSize)} ${a.label}`,
        sublabel: a.status === 'active' ? undefined : `(${a.status})`,
      }));
  }, [accounts]);

  const stats = useMFEMAEStats(accountScopedTrades, plField);

  if (trades.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-50 mb-4">MFE / MAE Analysis</h2>
        <p className="text-slate-400">Add some trades to see MFE/MAE analysis.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-50">MFE / MAE Analysis</h2>
        <div className="flex items-center gap-3">
          {accountOptions.length > 0 && (
            <MultiSelect
              label="Account"
              value={selectedAccountIds}
              onChange={setSelectedAccountIds}
              options={accountOptions}
              placeholder="All accounts"
            />
          )}
          <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
        </div>
      </div>
      <MFEMAEPanel trades={accountScopedTrades} stats={stats} />
    </div>
  );
}
