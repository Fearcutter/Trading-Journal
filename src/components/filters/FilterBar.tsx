import { useSettings } from '../../context/SettingsContext';
import type { TradeFilters } from '../../hooks/useFilteredTrades';
import Select from '../ui/Select';
import DateRangePicker from '../ui/DateRangePicker';
import { RotateCcw } from 'lucide-react';
import { defaultFilters } from '../../hooks/useFilteredTrades';

interface FilterBarProps {
  filters: TradeFilters;
  onChange: (filters: TradeFilters) => void;
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const settings = useSettings();

  const update = <K extends keyof TradeFilters>(key: K, value: TradeFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const hasFilters = Object.entries(filters).some(([k, v]) => v !== '' && v !== (defaultFilters as unknown as Record<string, string>)[k]);

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <DateRangePicker
        from={filters.dateFrom}
        to={filters.dateTo}
        onFromChange={v => update('dateFrom', v)}
        onToChange={v => update('dateTo', v)}
      />
      <Select
        label="Instrument"
        value={filters.instrument}
        onValueChange={v => update('instrument', v)}
        options={[
          { value: '', label: 'All' },
          ...settings.instruments.map(i => ({ value: i.symbol, label: i.symbol })),
        ]}
      />
      <Select
        label="Direction"
        value={filters.direction}
        onValueChange={v => update('direction', v as TradeFilters['direction'])}
        options={[
          { value: '', label: 'All' },
          { value: 'long', label: 'Long' },
          { value: 'short', label: 'Short' },
        ]}
      />
      <Select
        label="Result"
        value={filters.result}
        onValueChange={v => update('result', v as TradeFilters['result'])}
        options={[
          { value: '', label: 'All' },
          { value: 'win', label: 'Win' },
          { value: 'loss', label: 'Loss' },
          { value: 'breakeven', label: 'Breakeven' },
        ]}
      />
      <Select
        label="Setup"
        value={filters.setupType}
        onValueChange={v => update('setupType', v)}
        options={[
          { value: '', label: 'All' },
          ...settings.setupTypes.map(s => ({ value: s, label: s })),
        ]}
      />
      {hasFilters && (
        <button
          onClick={() => onChange(defaultFilters)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RotateCcw size={14} />
          Clear
        </button>
      )}
    </div>
  );
}
