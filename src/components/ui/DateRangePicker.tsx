import Input from './Input';

interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export default function DateRangePicker({ from, to, onFromChange, onToChange }: DateRangePickerProps) {
  return (
    <div className="flex items-end gap-2">
      <Input label="From" type="date" value={from} onChange={e => onFromChange(e.target.value)} />
      <span className="pb-2 text-slate-500">—</span>
      <Input label="To" type="date" value={to} onChange={e => onToChange(e.target.value)} />
    </div>
  );
}
