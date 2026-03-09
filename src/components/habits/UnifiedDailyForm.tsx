import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import type { HabitCompletion, RuleAdherenceItem, TradingTendency } from '../../types/habit';
import type { EmotionBefore, EmotionAfter } from '../../types/trade';
import type { DailyHabitCheckIn } from '../../types/habit';
import type { DailyJournalEntry } from '../../types/journal';
import { useHabits } from '../../context/HabitContext';
import { useJournal } from '../../context/JournalContext';
import EmotionSelector from './EmotionSelector';
import TendencySelector from './TendencySelector';
import HabitChecklist from './HabitChecklist';
import RuleAdherenceChecklist from './RuleAdherenceChecklist';
import Select from '../ui/Select';
import TagInput from '../ui/TagInput';
import toast from 'react-hot-toast';

const MARKET_CONDITIONS = [
  { value: '', label: 'Select...' },
  { value: 'Trending Up', label: 'Trending Up' },
  { value: 'Trending Down', label: 'Trending Down' },
  { value: 'Ranging', label: 'Ranging' },
  { value: 'Volatile', label: 'Volatile' },
  { value: 'Low Volume', label: 'Low Volume' },
  { value: 'News-Driven', label: 'News-Driven' },
];

interface UnifiedDailyFormProps {
  date: string;
  existingCheckIn?: DailyHabitCheckIn;
  existingJournalEntry?: DailyJournalEntry;
}

export default function UnifiedDailyForm({ date, existingCheckIn, existingJournalEntry }: UnifiedDailyFormProps) {
  const { definitions, saveCheckIn } = useHabits();
  const { addEntry, updateEntry } = useJournal();

  // Journal fields
  const [preMarketPlan, setPreMarketPlan] = useState(existingJournalEntry?.preMarketPlan ?? '');
  const [marketConditions, setMarketConditions] = useState(existingJournalEntry?.marketConditions ?? '');
  const [goals, setGoals] = useState<string[]>(existingJournalEntry?.goals ?? []);

  // Habit check-in fields
  const [emotionBefore, setEmotionBefore] = useState<EmotionBefore | ''>(existingCheckIn?.emotionBefore || '');
  const [emotionAfter, setEmotionAfter] = useState<EmotionAfter | ''>(existingCheckIn?.emotionAfter || '');
  const [tendencies, setTendencies] = useState<TradingTendency[]>(existingCheckIn?.tendencies || []);
  const [completions, setCompletions] = useState<HabitCompletion[]>(existingCheckIn?.habitCompletions || []);
  const [ruleAdherence, setRuleAdherence] = useState<RuleAdherenceItem[]>(existingCheckIn?.ruleAdherence || []);

  // Shared: merge lessonsLearned + reflection into one field
  const [reflection, setReflection] = useState(
    existingCheckIn?.reflection || existingJournalEntry?.lessonsLearned || ''
  );

  // Unified day rating
  const [dayRating, setDayRating] = useState(
    existingCheckIn?.dayRating || existingJournalEntry?.rating || 0
  );

  const isSaved = !!existingCheckIn || !!existingJournalEntry;

  useEffect(() => {
    setPreMarketPlan(existingJournalEntry?.preMarketPlan ?? '');
    setMarketConditions(existingJournalEntry?.marketConditions ?? '');
    setGoals(existingJournalEntry?.goals ?? []);
    setEmotionBefore(existingCheckIn?.emotionBefore || '');
    setEmotionAfter(existingCheckIn?.emotionAfter || '');
    setTendencies(existingCheckIn?.tendencies || []);
    setCompletions(existingCheckIn?.habitCompletions || []);
    setRuleAdherence(existingCheckIn?.ruleAdherence || []);
    setReflection(existingCheckIn?.reflection || existingJournalEntry?.lessonsLearned || '');
    setDayRating(existingCheckIn?.dayRating || existingJournalEntry?.rating || 0);
  }, [existingCheckIn, existingJournalEntry, date]);

  const handleSave = () => {
    // Save to HabitContext
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

    // Save to JournalContext
    const journalData = {
      date,
      preMarketPlan,
      marketConditions,
      emotionalState: emotionBefore || '',
      lessonsLearned: reflection,
      rating: dayRating,
      goals,
    };

    if (existingJournalEntry) {
      updateEntry(existingJournalEntry.id, journalData);
    } else {
      addEntry(journalData);
    }

    toast.success('Daily entry saved');
  };

  return (
    <div className="space-y-6">
      {/* Date header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
        {isSaved && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 font-medium">Saved</span>
        )}
      </div>

      {/* Pre-Market Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pre-Market</h4>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">Pre-Market Plan</label>
          <textarea
            value={preMarketPlan}
            onChange={e => setPreMarketPlan(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="What's your plan for today?"
          />
        </div>
        <Select label="Market Conditions" value={marketConditions} onValueChange={setMarketConditions} options={MARKET_CONDITIONS} />
        <TagInput label="Goals" tags={goals} onChange={setGoals} placeholder="Add a goal..." />
      </div>

      {/* Pre-Session Emotions */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pre-Session</h4>
        <EmotionSelector
          label="How do you feel before trading?"
          type="before"
          value={emotionBefore}
          onChange={v => setEmotionBefore(v as EmotionBefore | '')}
        />
      </div>

      {/* Habits & Rules */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Habits & Rules</h4>
        <HabitChecklist
          definitions={definitions}
          completions={completions}
          onChange={setCompletions}
        />
        <RuleAdherenceChecklist
          adherence={ruleAdherence}
          onChange={setRuleAdherence}
        />
      </div>

      {/* Post-Session Review */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Post-Session Review</h4>
        <EmotionSelector
          label="How do you feel after trading?"
          type="after"
          value={emotionAfter}
          onChange={v => setEmotionAfter(v as EmotionAfter | '')}
        />
        <TendencySelector selected={tendencies} onChange={setTendencies} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">Lessons & Reflection</label>
          <textarea
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="What went well? What could improve? Key takeaways..."
          />
        </div>
      </div>

      {/* Day Rating */}
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

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
      >
        {isSaved ? 'Update Entry' : 'Save Entry'}
      </button>
    </div>
  );
}
