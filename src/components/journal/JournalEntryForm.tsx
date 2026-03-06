import { useState } from 'react';
import type { DailyJournalEntry } from '../../types/journal';
import Select from '../ui/Select';
import Button from '../ui/Button';
import TagInput from '../ui/TagInput';
import { Star } from 'lucide-react';

const MARKET_CONDITIONS = [
  { value: '', label: 'Select...' },
  { value: 'Trending Up', label: 'Trending Up' },
  { value: 'Trending Down', label: 'Trending Down' },
  { value: 'Ranging', label: 'Ranging' },
  { value: 'Volatile', label: 'Volatile' },
  { value: 'Low Volume', label: 'Low Volume' },
  { value: 'News-Driven', label: 'News-Driven' },
];

const EMOTIONAL_STATES = [
  { value: '', label: 'Select...' },
  { value: 'Focused', label: 'Focused' },
  { value: 'Anxious', label: 'Anxious' },
  { value: 'Confident', label: 'Confident' },
  { value: 'Tired', label: 'Tired' },
  { value: 'Excited', label: 'Excited' },
  { value: 'Neutral', label: 'Neutral' },
];

interface JournalEntryFormProps {
  initialData?: DailyJournalEntry;
  onSubmit: (data: Omit<DailyJournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  date: string;
}

export default function JournalEntryForm({ initialData, onSubmit, date }: JournalEntryFormProps) {
  const [preMarketPlan, setPreMarketPlan] = useState(initialData?.preMarketPlan ?? '');
  const [marketConditions, setMarketConditions] = useState(initialData?.marketConditions ?? '');
  const [emotionalState, setEmotionalState] = useState(initialData?.emotionalState ?? '');
  const [lessonsLearned, setLessonsLearned] = useState(initialData?.lessonsLearned ?? '');
  const [rating, setRating] = useState(initialData?.rating ?? 0);
  const [goals, setGoals] = useState<string[]>(initialData?.goals ?? []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date,
      preMarketPlan,
      marketConditions,
      emotionalState,
      lessonsLearned,
      rating,
      goals,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-slate-400">
        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <Select label="Market Conditions" value={marketConditions} onValueChange={setMarketConditions} options={MARKET_CONDITIONS} />
        <Select label="Emotional State" value={emotionalState} onValueChange={setEmotionalState} options={EMOTIONAL_STATES} />
      </div>

      <TagInput label="Goals" tags={goals} onChange={setGoals} placeholder="Add a goal..." />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Lessons Learned</label>
        <textarea
          value={lessonsLearned}
          onChange={e => setLessonsLearned(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="End of day reflection..."
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Day Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="p-1 transition-colors"
            >
              <Star
                size={24}
                className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <Button type="submit">
          {initialData ? 'Update Entry' : 'Save Entry'}
        </Button>
      </div>
    </form>
  );
}
