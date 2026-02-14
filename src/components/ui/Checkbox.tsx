import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

interface CheckboxProps {
  id?: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export default function Checkbox({ id, label, checked, onCheckedChange }: CheckboxProps) {
  const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex items-center gap-2">
      <RadixCheckbox.Root
        id={checkboxId}
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val === true)}
        className="w-5 h-5 bg-slate-800 border border-slate-600 rounded flex items-center justify-center shrink-0 hover:border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-colors"
      >
        <RadixCheckbox.Indicator>
          <Check size={14} className="text-white" />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <label htmlFor={checkboxId} className="text-sm text-slate-300 cursor-pointer select-none">
        {label}
      </label>
    </div>
  );
}
