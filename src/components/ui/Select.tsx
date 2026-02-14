import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';

const EMPTY_SENTINEL = '__empty__';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export default function Select({ label, value, onValueChange, options, placeholder = 'Select...' }: SelectProps) {
  // Map empty-string options to a sentinel value that Radix can handle
  const mappedOptions = options.map(opt => ({
    ...opt,
    value: opt.value === '' ? EMPTY_SENTINEL : opt.value,
  }));

  // When the caller's value is "", pass undefined so Radix shows the placeholder
  const radixValue = value === '' ? undefined : value;

  const handleValueChange = (v: string) => {
    onValueChange(v === EMPTY_SENTINEL ? '' : v);
  };

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      <RadixSelect.Root value={radixValue} onValueChange={handleValueChange}>
        <RadixSelect.Trigger className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={16} className="text-slate-400" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden z-50" position="popper" sideOffset={4}>
            <RadixSelect.Viewport className="p-1">
              {mappedOptions.map(opt => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 rounded-md cursor-pointer outline-none hover:bg-slate-700 data-[highlighted]:bg-slate-700"
                >
                  <RadixSelect.ItemIndicator>
                    <Check size={14} className="text-blue-400" />
                  </RadixSelect.ItemIndicator>
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
