import { useState } from 'react';
import { Plus, Trash2, GripVertical, Tags } from 'lucide-react';
import { useHabits } from '../../context/HabitContext';
import { useSettings } from '../../context/SettingsContext';
import { HABIT_CATEGORY_LABELS, getHabitCategoryColor } from '../../constants/habits';
import CustomHabitForm from './CustomHabitForm';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

export default function HabitManagementList() {
  const { definitions, addDefinition, updateDefinition, deleteDefinition } = useHabits();
  const settings = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Merge built-in + custom category labels
  const allCategoryLabels: Record<string, string> = { ...HABIT_CATEGORY_LABELS };
  for (const c of settings.customHabitCategories || []) {
    allCategoryLabels[c.key] = c.label;
  }
  const customCategoryKeys = (settings.customHabitCategories || []).map(c => c.key);

  // Start with all known categories (so empty ones still show), then add habits
  const grouped = Object.keys(allCategoryLabels).reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {} as Record<string, typeof definitions>);
  for (const h of definitions) {
    if (!grouped[h.category]) grouped[h.category] = [];
    grouped[h.category].push(h);
  }

  const handleAdd = (data: { name: string; description: string; category: string }) => {
    addDefinition({
      name: data.name,
      description: data.description,
      category: data.category as any,
      isPreset: false,
      isActive: true,
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">My Habits</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus size={14} /> Add Habit
        </button>
      </div>

      {showForm && (
        <CustomHabitForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {Object.entries(grouped).map(([category, habits]) => (
        <div key={category} className="space-y-2">
          <h4 className={`text-xs font-semibold uppercase tracking-wider ${getHabitCategoryColor(category, customCategoryKeys.indexOf(category))}`}>
            {allCategoryLabels[category] || category}
          </h4>
          {habits.length === 0 && (
            <p className="text-xs text-slate-500 italic pl-2">No habits yet — click "Add Habit" to create one in this category.</p>
          )}
          {habits.map(habit => (
            <div
              key={habit.id}
              className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg p-3"
            >
              <GripVertical size={14} className="text-slate-600 shrink-0" />
              <CheckboxPrimitive.Root
                checked={habit.isActive}
                onCheckedChange={() => updateDefinition(habit.id, { isActive: !habit.isActive })}
                className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  habit.isActive
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'bg-slate-700 border-slate-600'
                }`}
              >
                <CheckboxPrimitive.Indicator>
                  <Check size={14} className="text-white" />
                </CheckboxPrimitive.Indicator>
              </CheckboxPrimitive.Root>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${habit.isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                  {habit.name}
                </p>
                {habit.description && (
                  <p className="text-xs text-slate-500 truncate">{habit.description}</p>
                )}
              </div>
              {habit.isPreset && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 shrink-0">Preset</span>
              )}
              <button
                onClick={() => deleteDefinition(habit.id)}
                className="p-1 hover:bg-slate-700 rounded transition-colors shrink-0"
              >
                <Trash2 size={14} className="text-slate-500 hover:text-rose-400" />
              </button>
            </div>
          ))}
        </div>
      ))}

      {/* Manage Categories */}
      <div className="border-t border-slate-700 pt-5 space-y-3">
        <div className="flex items-center gap-2">
          <Tags size={14} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">Habit Categories</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(allCategoryLabels).map(([key, label]) => {
            const isBuiltIn = key in HABIT_CATEGORY_LABELS;
            return (
              <div
                key={key}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg"
              >
                <span className={`text-xs font-medium ${getHabitCategoryColor(key, customCategoryKeys.indexOf(key))}`}>
                  {label}
                </span>
                {!isBuiltIn && (
                  <button
                    onClick={() => {
                      settings.updateSettings({
                        customHabitCategories: (settings.customHabitCategories || []).filter(c => c.key !== key),
                      });
                    }}
                    className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = newCategoryName.trim();
                if (!trimmed) return;
                const key = trimmed.toLowerCase().replace(/\s+/g, '-');
                if (allCategoryLabels[key]) return;
                settings.updateSettings({
                  customHabitCategories: [...(settings.customHabitCategories || []), { key, label: trimmed }],
                });
                setNewCategoryName('');
              }
            }}
            placeholder="New category name..."
            className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              const trimmed = newCategoryName.trim();
              if (!trimmed) return;
              const key = trimmed.toLowerCase().replace(/\s+/g, '-');
              if (allCategoryLabels[key]) return;
              settings.updateSettings({
                customHabitCategories: [...(settings.customHabitCategories || []), { key, label: trimmed }],
              });
              setNewCategoryName('');
            }}
            disabled={!newCategoryName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
