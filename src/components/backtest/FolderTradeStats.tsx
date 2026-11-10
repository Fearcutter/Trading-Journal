import { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import { useTrades } from '../../context/TradeContext';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import { useAdvancedStats } from '../../hooks/useAdvancedStats';
import { useMFEMAEStats } from '../../hooks/useMFEMAEStats';
import SessionAnalyticsTab from '../analytics/SessionAnalyticsTab';
import TimingSection from '../analytics/TimingSection';
import LowerRRSection from '../analytics/LowerRRSection';
import MFEMAEPanel from '../analytics/MFEMAEPanel';
import ConfluencesTab from '../confluences/ConfluencesTab';
import OverlapScopeToggle, { type OverlapScope } from '../filters/OverlapScopeToggle';
import MultiSelect from '../ui/MultiSelect';
import EmptyState from '../ui/EmptyState';
import type { BacktestSession } from '../../types/backtest';

export type FolderStatsTab = 'analytics' | 'confluences' | 'mfe-mae';

/** A session's Analytics, Confluences and MFE / MAE tabs, for every trade in a folder. */
export default function FolderTradeStats({ tab, sessions }: { tab: FolderStatsTab; sessions: BacktestSession[] }) {
  const { trades } = useTrades();
  const { plField } = usePLFormatter();
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
  const [picked, setPicked] = useState<string[]>([]);

  const scoped = useMemo(() => {
    const ids = new Set(picked.length ? picked : sessions.map(s => s.id));
    return trades
      .filter(t => t.sessionId && ids.has(t.sessionId))
      .filter(t => overlapScope !== 'exclude' || !t.overlap);
  }, [trades, sessions, picked, overlapScope]);

  const advanced = useAdvancedStats(scoped, plField);
  const mfeStats = useMFEMAEStats(scoped, plField);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-400">
          {scoped.length} trade{scoped.length === 1 ? '' : 's'} from {picked.length || sessions.length} session{(picked.length || sessions.length) === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-3">
          {sessions.length > 1 && (
            <MultiSelect
              value={picked}
              onChange={setPicked}
              options={sessions.map(s => ({ value: s.id, label: s.name }))}
              placeholder="All sessions"
            />
          )}
          <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
        </div>
      </div>

      {tab === 'analytics' && (
        <>
          <SessionAnalyticsTab advanced={advanced} trades={scoped} tradeCount={scoped.length} />
          {scoped.length > 0 && <TimingSection trades={scoped} showScope={false} />}
          {scoped.length > 0 && <LowerRRSection trades={scoped} showScope={false} />}
        </>
      )}
      {tab === 'confluences' && <ConfluencesTab trades={scoped} />}
      {tab === 'mfe-mae' && (
        scoped.length === 0
          ? <EmptyState icon={<Target size={48} />} title="No trades yet" description="Add trades to sessions in this folder to see MFE/MAE analysis." />
          : <MFEMAEPanel trades={scoped} stats={mfeStats} />
      )}
    </div>
  );
}
