import { useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useApexAccounts } from '../../context/ApexAccountContext';
import type { TradeFilters } from '../../hooks/useFilteredTrades';
import Select from '../ui/Select';
import MultiSelect, { type MultiSelectOption } from '../ui/MultiSelect';
import DateRangePicker from '../ui/DateRangePicker';
import { RotateCcw } from 'lucide-react';
import { defaultFilters } from '../../hooks/useFilteredTrades';

interface FilterBarProps {
  filters: TradeFilters;
  onChange: (filters: TradeFilters) => void;
  hideAccountFilter?: boolean;
}

const STATUS_ORDER: Record<string, number> = { active: 0, blown: 1, completed: 2 };

export default function FilterBar({ filters, onChange, hideAccountFilter }: FilterBarProps) {
  const settings = useSettings();
  const { accounts } = useApexAccounts();

  const update = <K extends keyof TradeFilters>(key: K, value: TradeFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const hasFilters =
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.instrument !== '' ||
    filters.direction !== '' ||
    filters.result !== '' ||
    filters.setupType !== '' ||
    filters.rMultiple !== '' ||
    filters.search !== '' ||
    filters.overlap !== '' ||
    filters.accountIds.length > 0;

  const accountOptions: MultiSelectOption[] = useMemo(() => {
    const formatSize = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));
    return [...accounts]
      .sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.label.localeCompare(b.label);
      })
      .map(a => ({
        value: a.id,
        label: `${formatSize(a.accountSize)} ${a.label}`,
        sublabel: a.status === 'active' ? undefined : `(${a.status})`,
      }));
  }, [accounts]);

  const showAccountFilter = !hideAccountFilter && accountOptions.length > 0;

  const clearAll = () => {
    onChange({ ...defaultFilters, sessionId: filters.sessionId });
  };

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
        label="Overlap"
        value={filters.overlap}
        onValueChange={v => update('overlap', v as TradeFilters['overlap'])}
        options={[
          { value: '', label: 'All' },
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
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
      <Select
        label="R Multiple"
        value={filters.rMultiple}
        onValueChange={v => update('rMultiple', v as TradeFilters['rMultiple'])}
        options={[
          { value: '', label: 'All' },
          { value: 'reached3R', label: '3R+' },
          { value: 'reached2R', label: '2R' },
          { value: 'be', label: 'BE (1R)' },
          { value: 'loss', label: 'Loss (<1R)' },
        ]}
      />
      {showAccountFilter && (
        <MultiSelect
          label="Account"
          value={filters.accountIds}
          onChange={v => update('accountIds', v)}
          options={accountOptions}
          placeholder="All"
        />
      )}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RotateCcw size={14} />
          Clear
        </button>
      )}
    </div>
  );
}
