import type { EmotionBefore, EmotionAfter } from '../../types/trade';
import { EMOTIONS_BEFORE, EMOTIONS_AFTER } from '../../constants/emotions';

interface EmotionSelectorProps {
  label: string;
  type: 'before' | 'after';
  value: string;
  onChange: (value: string) => void;
}

export default function EmotionSelector({ label, type, value, onChange }: EmotionSelectorProps) {
  const options = type === 'before' ? EMOTIONS_BEFORE : EMOTIONS_AFTER;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(emotion => (
          <button
            key={emotion}
            type="button"
            onClick={() => onChange(value === emotion ? '' : emotion)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              value === emotion
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {emotion}
          </button>
        ))}
      </div>
    </div>
  );
}
