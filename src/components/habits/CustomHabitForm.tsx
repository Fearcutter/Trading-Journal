import { useState } from 'react';
import { HABIT_CATEGORY_LABELS } from '../../constants/habits';
import { useSettings } from '../../context/SettingsContext';

interface CustomHabitFormProps {
  onAdd: (data: { name: string; description: string; category: string }) => void;
  onCancel: () => void;
}

export default function CustomHabitForm({ onAdd, onCancel }: CustomHabitFormProps) {
  const settings = useSettings();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('execution');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  // Merge built-in + custom category labels
  const allCategories: Record<string, string> = { ...HABIT_CATEGORY_LABELS };
  for (const c of settings.customHabitCategories || []) {
    allCategories[c.key] = c.label;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), description: description.trim(), category });
    setName('');
    setDescription('');
  };

  const handleCreateCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase().replace(/\s+/g, '-');
    if (allCategories[key]) return;
    settings.updateSettings({
      customHabitCategories: [...(settings.customHabitCategories || []), { key, label: trimmed }],
    });
    setCategory(key);
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-slate-200">Add Custom Habit</h4>
      <input
        type="text"
        placeholder="Habit name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="space-y-2">
        <select
          value={category}
          onChange={e => {
            if (e.target.value === '__new__') {
              setShowNewCategory(true);
            } else {
              setCategory(e.target.value);
              setShowNewCategory(false);
            }
          }}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(allCategories).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
          <option value="__new__">+ New Category...</option>
        </select>
        {showNewCategory && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Category name..."
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim()}
              className="px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Add Habit
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
