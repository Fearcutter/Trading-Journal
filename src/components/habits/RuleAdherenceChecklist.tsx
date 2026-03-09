import { usePlaybook } from '../../context/PlaybookContext';
import type { RuleAdherenceItem } from '../../types/habit';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

interface RuleAdherenceChecklistProps {
  adherence: RuleAdherenceItem[];
  onChange: (adherence: RuleAdherenceItem[]) => void;
}

export default function RuleAdherenceChecklist({ adherence, onChange }: RuleAdherenceChecklistProps) {
  const { entries } = usePlaybook();

  if (entries.length === 0) return null;

  const allRules: RuleAdherenceItem[] = entries.flatMap(entry => [
    ...entry.entryRules.map(r => ({ playbookEntryId: entry.id, ruleName: r, ruleType: 'entry' as const, followed: true })),
    ...entry.exitRules.map(r => ({ playbookEntryId: entry.id, ruleName: r, ruleType: 'exit' as const, followed: true })),
    ...entry.riskRules.map(r => ({ playbookEntryId: entry.id, ruleName: r, ruleType: 'risk' as const, followed: true })),
  ]);

  if (allRules.length === 0) return null;

  const getItem = (playbookEntryId: string, ruleName: string) =>
    adherence.find(a => a.playbookEntryId === playbookEntryId && a.ruleName === ruleName);

  const toggle = (playbookEntryId: string, ruleName: string, ruleType: 'entry' | 'exit' | 'risk') => {
    const existing = getItem(playbookEntryId, ruleName);
    if (existing) {
      onChange(adherence.map(a =>
        a.playbookEntryId === playbookEntryId && a.ruleName === ruleName
          ? { ...a, followed: !a.followed } : a
      ));
    } else {
      onChange([...adherence, { playbookEntryId, ruleName, ruleType, followed: false }]);
    }
  };

  const ruleTypeColors: Record<string, string> = {
    entry: 'text-blue-400',
    exit: 'text-amber-400',
    risk: 'text-rose-400',
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-300">Rule Adherence</label>
      {entries.map(entry => {
        const entryRules = [
          ...entry.entryRules.map(r => ({ name: r, type: 'entry' as const })),
          ...entry.exitRules.map(r => ({ name: r, type: 'exit' as const })),
          ...entry.riskRules.map(r => ({ name: r, type: 'risk' as const })),
        ];
        if (entryRules.length === 0) return null;
        return (
          <div key={entry.id} className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400">{entry.name}</h4>
            {entryRules.map(rule => {
              const item = getItem(entry.id, rule.name);
              const isFollowed = item?.followed ?? true;
              return (
                <div key={`${entry.id}-${rule.name}`} className="flex items-center gap-3">
                  <CheckboxPrimitive.Root
                    checked={isFollowed}
                    onCheckedChange={() => toggle(entry.id, rule.name, rule.type)}
                    className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                      isFollowed
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <CheckboxPrimitive.Indicator>
                      <Check size={14} className="text-white" />
                    </CheckboxPrimitive.Indicator>
                  </CheckboxPrimitive.Root>
                  <span className={`text-[10px] uppercase font-semibold ${ruleTypeColors[rule.type]}`}>{rule.type}</span>
                  <span className={`text-sm ${isFollowed ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                    {rule.name}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
