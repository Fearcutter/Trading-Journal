import { formatPercent } from '../../utils/formatters';
import { formatR, type Summary, type analyzeAgainstCost } from '../../utils/confluence-insights';

function Panel({ title, stats }: { title: string; stats: Summary }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-1">{title}</p>
      <p className={`text-lg font-bold font-mono ${stats.rPerTrade === null ? 'text-slate-400' : stats.rPerTrade >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {formatR(stats.rPerTrade)} <span className="text-xs font-normal text-slate-500">per trade</span>
      </p>
      <p className="text-xs text-slate-400 mt-1">
        {stats.trades} trades · {stats.trades ? formatPercent(stats.winRate) : '—'} win
      </p>
    </div>
  );
}

export default function AgainstCost({ data }: { data: ReturnType<typeof analyzeAgainstCost> }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-medium text-slate-300">What do warnings cost me?</h3>
        <p className="text-xs text-slate-500 mt-0.5">Trades by how many AGAINST confluences were present when you took them</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Panel title="No AGAINST" stats={data.none} />
        <Panel title="1 AGAINST" stats={data.one} />
        <Panel title="2+ AGAINST" stats={data.twoPlus} />
      </div>
      {data.costR !== null && data.anyAgainst.trades > 0 && (
        <p className="text-sm text-slate-300">
          Trades taken against a warning:{' '}
          <span className={`font-mono font-semibold ${data.costR < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatR(data.costR)} per trade</span>{' '}
          compared with trades that had none.
        </p>
      )}
    </div>
  );
}
