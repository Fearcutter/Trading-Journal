import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrades } from '../context/TradeContext';
import { useFilteredTrades, defaultFilters } from '../hooks/useFilteredTrades';
import type { TradeFilters } from '../hooks/useFilteredTrades';
import FilterBar from '../components/filters/FilterBar';
import TradeRow from '../components/trade/TradeRow';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { exportTradesToCSV, downloadCSV } from '../utils/csv-export';
import { PlusCircle, Download, Trash2, Search, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TradeLogPage() {
  const { trades, deleteTrades } = useTrades();
  const [filters, setFilters] = useState<TradeFilters>(defaultFilters);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeFilters = { ...filters, search };
  const filtered = useFilteredTrades(trades, activeFilters);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} trade(s)?`)) return;
    deleteTrades(Array.from(selectedIds));
    setSelectedIds(new Set());
    toast.success(`Deleted ${selectedIds.size} trade(s)`);
  };

  const handleExportCSV = () => {
    const csv = exportTradesToCSV(filtered);
    downloadCSV(csv, `trades-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('CSV exported');
  };

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen size={48} />}
        title="No trades yet"
        description="Start logging your trades to build your journal."
        action={
          <Link to="/trades/new">
            <Button><PlusCircle size={16} /> Add First Trade</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Search + Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search trades..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              <Trash2 size={14} /> Delete ({selectedIds.size})
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </Button>
          <Link to="/trades/new">
            <Button size="sm"><PlusCircle size={14} /> New Trade</Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 text-left">
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-600 bg-slate-800"
                  />
                </th>
                <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Instr.</th>
                <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Dir.</th>
                <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Entry</th>
                <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Exit</th>
                <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Points</th>
                <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">P&L</th>
                <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Result</th>
                <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Setup</th>
                <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(trade => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  selected={selectedIds.has(trade.id)}
                  onSelect={toggleSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">
            No trades match your filters.
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Showing {filtered.length} of {trades.length} trade{trades.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
