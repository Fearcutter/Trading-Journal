import { useState } from 'react';
import type { PlaybookEntry } from '../../types/playbook';
import { useSettings } from '../../context/SettingsContext';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import TagInput from '../ui/TagInput';
import ImageUpload from '../ui/ImageUpload';
import { Plus, X } from 'lucide-react';

interface PlaybookEditorProps {
  initialData?: PlaybookEntry;
  onSubmit: (data: Omit<PlaybookEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function RuleList({ label, rules, onChange }: { label: string; rules: string[]; onChange: (rules: string[]) => void }) {
  const [input, setInput] = useState('');

  const addRule = () => {
    const trimmed = input.trim();
    if (trimmed) {
      onChange([...rules, trimmed]);
      setInput('');
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div className="space-y-1">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200">
              {rule}
            </span>
            <button
              type="button"
              onClick={() => onChange(rules.filter((_, j) => j !== i))}
              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRule(); } }}
          placeholder={`Add ${label.toLowerCase().replace(' rules', ' rule')}...`}
          className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={addRule}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export default function PlaybookEditor({ initialData, onSubmit, onCancel }: PlaybookEditorProps) {
  const settings = useSettings();
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [entryRules, setEntryRules] = useState<string[]>(initialData?.entryRules ?? []);
  const [exitRules, setExitRules] = useState<string[]>(initialData?.exitRules ?? []);
  const [riskRules, setRiskRules] = useState<string[]>(initialData?.riskRules ?? []);
  const [setupType, setSetupType] = useState(initialData?.setupType ?? '');
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [exampleScreenshots, setExampleScreenshots] = useState<string[]>(initialData?.exampleScreenshots ?? []);

  const setupOptions = [
    { value: '', label: 'None' },
    ...settings.setupTypes.map(s => ({ value: s, label: s })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      entryRules,
      exitRules,
      riskRules,
      setupType,
      tags,
      exampleScreenshots,
    });
  };

  const addScreenshot = (value: string) => {
    if (value) setExampleScreenshots(prev => [...prev, value]);
  };

  const removeScreenshot = (index: number) => {
    setExampleScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Strategy Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Opening Range Breakout" />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Describe this strategy..."
        />
      </div>

      <Select label="Setup Type" value={setupType} onValueChange={setSetupType} options={setupOptions} />

      <RuleList label="Entry Rules" rules={entryRules} onChange={setEntryRules} />
      <RuleList label="Exit Rules" rules={exitRules} onChange={setExitRules} />
      <RuleList label="Risk Rules" rules={riskRules} onChange={setRiskRules} />

      <TagInput label="Tags" tags={tags} onChange={setTags} placeholder="Add tags..." />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Example Screenshots</label>
        <div className="grid grid-cols-2 gap-2">
          {exampleScreenshots.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img} alt={`Example ${i + 1}`} className="w-full rounded-lg border border-slate-600 max-h-32 object-cover" />
              <button
                type="button"
                onClick={() => removeScreenshot(i)}
                className="absolute top-1 right-1 p-1 bg-slate-900/80 rounded-lg text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <ImageUpload
          label=""
          value=""
          onChange={addScreenshot}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Strategy' : 'Create Strategy'}</Button>
      </div>
    </form>
  );
}
