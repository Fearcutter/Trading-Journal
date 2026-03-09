import type { HabitDefinition, HabitCompletion } from '../../types/habit';
import { HABIT_CATEGORY_LABELS, getHabitCategoryColor } from '../../constants/habits';
import { useSettings } from '../../context/SettingsContext';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

interface HabitChecklistProps {
  definitions: HabitDefinition[];
  completions: HabitCompletion[];
  onChange: (completions: HabitCompletion[]) => void;
}

export default function HabitChecklist({ definitions, completions, onChange }: HabitChecklistProps) {
  const settings = useSettings();
  const allCategoryLabels: Record<string, string> = { ...HABIT_CATEGORY_LABELS };
  for (const c of settings.customHabitCategories || []) {
    allCategoryLabels[c.key] = c.label;
  }
  const customCategoryKeys = (settings.customHabitCategories || []).map(c => c.key);
  const active = definitions.filter(d => d.isActive);
  const grouped = active.reduce((acc, h) => {
    if (!acc[h.category]) acc[h.category] = [];
    acc[h.category].push(h);
    return acc;
  }, {} as Record<string, HabitDefinition[]>);

  const getCompletion = (habitId: string) =>
    completions.find(c => c.habitId === habitId);

  const toggleHabit = (habitId: string) => {
    const existing = getCompletion(habitId);
    if (existing) {
      onChange(completions.map(c =>
        c.habitId === habitId ? { ...c, completed: !c.completed } : c
      ));
    } else {
      onChange([...completions, { habitId, completed: true, note: '' }]);
    }
  };

  const updateNote = (habitId: string, note: string) => {
    const existing = getCompletion(habitId);
    if (existing) {
      onChange(completions.map(c =>
        c.habitId === habitId ? { ...c, note } : c
      ));
    } else {
      onChange([...completions, { habitId, completed: false, note }]);
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-slate-300">Habit Checklist</label>
      {Object.entries(grouped).map(([category, habits]) => (
        <div key={category} className="space-y-2">
          <h4 className={`text-xs font-semibold uppercase tracking-wider ${getHabitCategoryColor(category, customCategoryKeys.indexOf(category))}`}>
            {allCategoryLabels[category] || category}
          </h4>
          {habits.map(habit => {
            const completion = getCompletion(habit.id);
            const isChecked = completion?.completed ?? false;
            return (
              <div key={habit.id} className="space-y-1">
                <div className="flex items-center gap-3">
                  <CheckboxPrimitive.Root
                    checked={isChecked}
                    onCheckedChange={() => toggleHabit(habit.id)}
                    className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                      isChecked
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <CheckboxPrimitive.Indicator>
                      <Check size={14} className="text-white" />
                    </CheckboxPrimitive.Indicator>
                  </CheckboxPrimitive.Root>
                  <div className="flex-1">
                    <span className={`text-sm ${isChecked ? 'text-slate-200' : 'text-slate-400'}`}>
                      {habit.name}
                    </span>
                  </div>
                </div>
                {isChecked && (
                  <input
                    type="text"
                    placeholder="Optional note..."
                    value={completion?.note || ''}
                    onChange={e => updateNote(habit.id, e.target.value)}
                    className="ml-8 w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
