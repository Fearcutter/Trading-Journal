import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import type { DailyHabitCheckIn, HabitCompletion, RuleAdherenceItem, TradingTendency } from '../../types/habit';
import type { EmotionBefore, EmotionAfter } from '../../types/trade';
import { useHabits } from '../../context/HabitContext';
import EmotionSelector from './EmotionSelector';
import TendencySelector from './TendencySelector';
import HabitChecklist from './HabitChecklist';
import RuleAdherenceChecklist from './RuleAdherenceChecklist';

interface DailyCheckInFormProps {
  date: string;
  existingCheckIn?: DailyHabitCheckIn;
}

export default function DailyCheckInForm({ date, existingCheckIn }: DailyCheckInFormProps) {
  const { definitions, saveCheckIn } = useHabits();

  const [emotionBefore, setEmotionBefore] = useState<EmotionBefore | ''>(existingCheckIn?.emotionBefore || '');
  const [emotionAfter, setEmotionAfter] = useState<EmotionAfter | ''>(existingCheckIn?.emotionAfter || '');
  const [tendencies, setTendencies] = useState<TradingTendency[]>(existingCheckIn?.tendencies || []);
  const [completions, setCompletions] = useState<HabitCompletion[]>(existingCheckIn?.habitCompletions || []);
  const [ruleAdherence, setRuleAdherence] = useState<RuleAdherenceItem[]>(existingCheckIn?.ruleAdherence || []);
  const [dayRating, setDayRating] = useState(existingCheckIn?.dayRating || 0);
  const [reflection, setReflection] = useState(existingCheckIn?.reflection || '');

  useEffect(() => {
    setEmotionBefore(existingCheckIn?.emotionBefore || '');
    setEmotionAfter(existingCheckIn?.emotionAfter || '');
    setTendencies(existingCheckIn?.tendencies || []);
    setCompletions(existingCheckIn?.habitCompletions || []);
    setRuleAdherence(existingCheckIn?.ruleAdherence || []);
    setDayRating(existingCheckIn?.dayRating || 0);
    setReflection(existingCheckIn?.reflection || '');
  }, [existingCheckIn, date]);

  const handleSave = () => {
    saveCheckIn({
      date,
      emotionBefore,
      emotionAfter,
      tendencies,
      habitCompletions: completions,
      ruleAdherence,
      dayRating,
      reflection,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          Check-In for {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
        {existingCheckIn && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 font-medium">Saved</span>
        )}
      </div>

      <EmotionSelector
        label="How did you feel before trading?"
        type="before"
        value={emotionBefore}
        onChange={v => setEmotionBefore(v as EmotionBefore | '')}
      />

      <HabitChecklist
        definitions={definitions}
        completions={completions}
        onChange={setCompletions}
      />

      <RuleAdherenceChecklist
        adherence={ruleAdherence}
        onChange={setRuleAdherence}
      />

      <TendencySelector selected={tendencies} onChange={setTendencies} />

      <EmotionSelector
        label="How did you feel after trading?"
        type="after"
        value={emotionAfter}
        onChange={v => setEmotionAfter(v as EmotionAfter | '')}
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">Day Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setDayRating(star)}
              className="transition-colors"
            >
              <Star
                size={24}
                className={star <= dayRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">Reflection</label>
        <textarea
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          placeholder="What went well? What could improve? Key takeaways..."
          rows={4}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
      >
        {existingCheckIn ? 'Update Check-In' : 'Save Check-In'}
      </button>
    </div>
  );
}
