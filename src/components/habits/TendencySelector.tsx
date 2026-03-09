import type { TradingTendency } from '../../types/habit';
import { TRADING_TENDENCIES } from '../../constants/habits';

interface TendencySelectorProps {
  selected: TradingTendency[];
  onChange: (tendencies: TradingTendency[]) => void;
}

export default function TendencySelector({ selected, onChange }: TendencySelectorProps) {
  const toggle = (t: TradingTendency) => {
    if (selected.includes(t)) {
      onChange(selected.filter(s => s !== t));
    } else {
      onChange([...selected, t]);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">Tendencies Noticed</label>
      <div className="flex flex-wrap gap-2">
        {TRADING_TENDENCIES.map(tendency => (
          <button
            key={tendency}
            type="button"
            onClick={() => toggle(tendency)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selected.includes(tendency)
                ? 'bg-rose-600/80 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {tendency}
          </button>
        ))}
      </div>
    </div>
  );
}
