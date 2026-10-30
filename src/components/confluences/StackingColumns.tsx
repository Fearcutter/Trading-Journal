import { formatR, MIN_SAMPLE, type BucketRow } from '../../utils/confluence-insights';
import ShowNumbers from './ShowNumbers';
import StackingTable from './StackingTable';

/** R per trade per bucket as columns rising (green) or falling (red) from a zero line. */
export default function StackingColumns({ rows, title, subtitle, labelHeader }: { rows: BucketRow[]; title: string; subtitle: string; labelHeader: string }) {
  const maxAbs = Math.max(0.01, ...rows.map(r => Math.abs(r.stats.rPerTrade ?? 0)));
  const hasNegative = rows.some(r => (r.stats.rPerTrade ?? 0) < 0);
  const hasPositive = rows.some(r => (r.stats.rPerTrade ?? 0) > 0);
  // Room above and below the zero line only where it's needed
  const upH = hasPositive ? (hasNegative ? 70 : 120) : 0;
  const downH = hasNegative ? (hasPositive ? 50 : 120) : 0;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex gap-2">
        {rows.map(({ label, stats }) => {
          const r = stats.rPerTrade;
          const thin = stats.trades < MIN_SAMPLE;
          const size = r === null ? 0 : (Math.abs(r) / maxAbs);
          return (
            <div key={label} className="flex-1 flex flex-col items-center" title={`${labelHeader} ${label}: ${stats.trades} trades, ${formatR(r)} per trade`}>
              <div className="w-full flex items-end" style={{ height: upH }}>
                {r !== null && r > 0 && <div className={`w-full rounded-t bg-emerald-500 ${thin ? 'opacity-35' : ''}`} style={{ height: size * upH }} />}
              </div>
              <div className="w-full border-t border-slate-500" />
              <div className="w-full flex items-start" style={{ height: downH }}>
                {r !== null && r < 0 && <div className={`w-full rounded-b bg-rose-500 ${thin ? 'opacity-35' : ''}`} style={{ height: size * downH }} />}
              </div>
              <span className="mt-1 text-xs font-mono text-slate-200">{label}</span>
              <span className={`text-xs font-mono ${thin ? 'text-slate-500' : 'text-slate-300'}`}>{formatR(r)}{thin && stats.trades > 0 && '*'}</span>
              <span className="text-[11px] text-slate-500">{stats.trades} tr</span>
            </div>
          );
        })}
      </div>
      <ShowNumbers>
        <StackingTable rows={rows} title={title} subtitle={subtitle} labelHeader={labelHeader} />
      </ShowNumbers>
    </div>
  );
}
