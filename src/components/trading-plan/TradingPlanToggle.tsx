import type { TradingPlanState } from '../../hooks/useTradingPlanMode';

interface Props {
  planState: TradingPlanState;
  onToggle: (enabled: boolean) => void;
  onChangeN: (n: number) => void;
}

export default function TradingPlanToggle({ planState, onToggle, onChangeN }: Props) {
  return (
    <div className="flex items-center gap-3 ml-6 mt-2">
      <button
        onClick={() => onToggle(!planState.enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          planState.enabled ? 'bg-blue-600' : 'bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            planState.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
      <span className="text-sm text-slate-300">Trading Plan Mode</span>
      {planState.enabled && (
        <select
          value={planState.tradesPerDay}
          onChange={e => onChangeN(Number(e.target.value))}
          className="bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>
              {n} trade{n > 1 ? 's' : ''}/day
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
