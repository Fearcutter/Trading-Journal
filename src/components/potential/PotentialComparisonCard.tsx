import { useMemo } from 'react';
import { Eye } from 'lucide-react';
import Card from '../ui/Card';
import type { Trade } from '../../types/trade';
import { comparePotential, type PotentialGroupStats } from '../../utils/potential-trades';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import { formatPercent } from '../../utils/formatters';

const tone = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-slate-300');
const formatR = (r: number) => `${r > 0 ? '+' : ''}${r.toFixed(2)}R`;

/** Taken trades next to potential ones, and what taking all of them would have looked like. */
export default function PotentialComparisonCard({ trades }: { trades: Trade[] }) {
  const pl = usePLFormatter();
  const c = useMemo(() => comparePotential(trades, pl.getPL), [trades, pl.getPL]);
  if (c.potential.count === 0) return null;

  const columns: { title: string; sub: string; s: PotentialGroupStats; accent: string }[] = [
    { title: 'What I took', sub: 'trades taken', s: c.taken, accent: 'border-blue-500/60' },
    { title: 'Potential', sub: 'there, but not taken', s: c.potential, accent: 'border-sky-400/60' },
    { title: 'If I took them all', sub: 'taken + potential', s: c.combined, accent: 'border-slate-500/60' },
  ];
  const rows: { label: string; value: (s: PotentialGroupStats) => string; color?: (s: PotentialGroupStats) => string }[] = [
    { label: 'Trades', value: s => String(s.count) },
    { label: 'Win rate', value: s => (s.count ? formatPercent(s.winRate) : '—') },
    { label: 'Total P&L', value: s => pl.formatPLValue(s.totalPL), color: s => tone(s.totalPL) },
    { label: 'Total R', value: s => formatR(s.totalR), color: s => tone(s.totalR) },
    { label: 'Avg R', value: s => (s.avgR == null ? '—' : formatR(s.avgR)), color: s => tone(s.avgR ?? 0) },
  ];

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2"><Eye size={15} className="text-sky-400" /> Taken vs potential</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {columns.map(({ title, sub, s, accent }) => (
          <div key={title} className={`rounded-lg bg-slate-900/50 border-l-2 ${accent} px-3 py-2`}>
            <p className="text-sm font-semibold text-slate-100">{title}</p>
            <p className="text-[11px] text-slate-500 mb-2">{sub}</p>
            <dl className="space-y-1">
              {rows.map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <dt className="text-slate-500">{r.label}</dt>
                  <dd className={`font-mono ${r.color ? r.color(s) : 'text-slate-200'}`}>{r.value(s)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">Potential trades never count in your stats, accounts or payouts. They only show up here and in the trade log.</p>
    </Card>
  );
}
