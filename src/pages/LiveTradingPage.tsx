import { useState, useMemo } from 'react';
import { BarChart3, BookOpen, LineChart as LineChartIcon, PlusCircle, ClipboardPaste, ChevronUp, TrendingUp, Download, Trash2, Search, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { useTrades } from '../context/TradeContext';
import { useApexAccounts } from '../context/ApexAccountContext';
import { useSettings } from '../context/SettingsContext';
import { computeCurrentCycle, checkEligibility } from '../utils/apex-payout';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useAdvancedStats } from '../hooks/useAdvancedStats';
import { useFilteredTrades, defaultFilters } from '../hooks/useFilteredTrades';
import type { TradeFilters } from '../hooks/useFilteredTrades';
import FilterBar from '../components/filters/FilterBar';
import TradeForm from '../components/trade/TradeForm';
import TradeRow from '../components/trade/TradeRow';
import type { HiddenColumns } from '../components/trade/TradeRow';
import PasteTradeModal from '../components/trade/PasteTradeModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import type { TradeFormData } from '../types/trade';
import { formatPercent } from '../utils/formatters';
import { usePLFormatter } from '../hooks/usePLFormatter';
import { useTradingPlanMode } from '../hooks/useTradingPlanMode';
import { useTradingPlanStats, type TradingPlanComparison } from '../hooks/useTradingPlanStats';
import TradingPlanToggle from '../components/trading-plan/TradingPlanToggle';
import ComparisonDashboard from '../components/trading-plan/ComparisonDashboard';
import MissedTradesBreakdown from '../components/trading-plan/MissedTradesBreakdown';
import BestVsFirstComparison from '../components/trading-plan/BestVsFirstComparison';
import { exportTradesToCSV, downloadCSV } from '../utils/csv-export';

type Tab = 'dashboard' | 'tradelog' | 'analytics';

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'tradelog', label: 'Trade Log', icon: BookOpen },
  { key: 'analytics', label: 'Analytics', icon: LineChartIcon },
];

export default function LiveTradingPage() {
  const { trades, addTrade } = useTrades();
  const { accounts } = useApexAccounts();

  const [activeTab, setActiveTab] = useState<Tab>('tradelog');

  const liveTrades = useMemo(
    () => trades.filter(t => !t.sessionId).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.time || '').localeCompare(a.time || '');
    }),
    [trades]
  );

  const { plField } = usePLFormatter();
  const { planState, setEnabled, setTradesPerDay } = useTradingPlanMode('live');
  const planComparison = useTradingPlanStats(liveTrades, planState, plField);
  const activeTrades = planState.enabled && planComparison ? planComparison.planTrades : liveTrades;
  const dashboard = useDashboardStats(activeTrades, plField);
  const advanced = useAdvancedStats(activeTrades, plField);

  const handleTradeSubmit = (data: TradeFormData) => {
    const trade = addTrade(data);
    toast.success('Trade saved!');

    // Check if any linked accounts just became payout-eligible
    if (trade.accountIds?.length) {
      // We need updated trades list including the new trade
      const updatedTrades = [trade, ...trades];
      for (const accId of trade.accountIds) {
        const account = accounts.find(a => a.id === accId && a.status === 'active');
        if (!account) continue;
        const cycle = computeCurrentCycle(account, updatedTrades);
        const result = checkEligibility(cycle, account);
        if (result.eligible) {
          const sizeLabel = account.accountSize >= 1000 ? `${account.accountSize / 1000}K` : account.accountSize;
          toast.success(`${sizeLabel} ${account.label} is ready for payout!`, { duration: 5000 });
        }
      }
    }
  };

  if (liveTrades.length === 0 && activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <TradingPlanToggle planState={planState} onToggle={setEnabled} onChangeN={setTradesPerDay} />
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <EmptyState
          icon={<TrendingUp size={48} />}
          title="No live trades yet"
          description="Add trades to see your dashboard statistics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <TradingPlanToggle planState={planState} onToggle={setEnabled} onChangeN={setTradesPerDay} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'dashboard' && <DashboardTab dashboard={dashboard} tradeCount={activeTrades.length} planComparison={planComparison} />}
      {activeTab === 'tradelog' && (
        <TradeLogTab
          liveTrades={liveTrades}
          onTradeSubmit={handleTradeSubmit}
          skippedTradeIds={planComparison?.skippedTradeIds}
        />
      )}
      {activeTab === 'analytics' && <AnalyticsTab advanced={advanced} tradeCount={activeTrades.length} planComparison={planComparison} />}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center gap-3">
      <TrendingUp size={24} className="text-blue-400" />
      <h1 className="text-xl font-bold text-slate-50">Live Trading</h1>
    </div>
  );
}

function TabBar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  return (
    <div className="flex gap-1 border-b border-slate-700 pb-px">
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === key
              ? 'bg-slate-800 text-slate-50 border border-slate-700 border-b-slate-800 -mb-px'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}

function DashboardTab({ dashboard, tradeCount, planComparison }: { dashboard: ReturnType<typeof useDashboardStats>; tradeCount: number; planComparison?: TradingPlanComparison | null }) {
  const pl = usePLFormatter();

  if (tradeCount === 0) {
    return <EmptyState icon={<BarChart3 size={48} />} title="No trades yet" description="Add trades to see statistics." />;
  }

  const { stats, cumulativePL } = dashboard;

  return (
    <div className="space-y-4">
      {planComparison && (
        <>
          <ComparisonDashboard comparison={planComparison} />
          <MissedTradesBreakdown comparison={planComparison} />
        </>
      )}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatMini label="Total Trades" value={String(stats.totalTrades)} />
        <StatMini label="Win Rate" value={formatPercent(stats.winRate)} />
        <StatMini label="Total P&L" value={pl.formatPLValue(stats.totalPL)} color={stats.totalPL > 0 ? 'text-emerald-400' : stats.totalPL < 0 ? 'text-rose-400' : undefined} />
        <StatMini label="Avg P&L" value={stats.totalTrades > 0 ? pl.formatPLValue(stats.totalPL / stats.totalTrades) : pl.formatPLAbs(0)} color={stats.totalPL > 0 ? 'text-emerald-400' : stats.totalPL < 0 ? 'text-rose-400' : undefined} />
        <StatMini label="Profit Factor" value={stats.profitFactor === Infinity ? '---' : stats.profitFactor.toFixed(2)} />
      </div>
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-4">Cumulative P&L</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={cumulativePL}>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={pl.tickFormatter} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number | undefined) => [pl.tooltipFormatter(value ?? 0), 'P&L']}
            />
            <ReferenceLine y={0} stroke="#334155" />
            <Line type="monotone" dataKey="pl" stroke="#2dd4bf" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color || 'text-slate-50'}`}>{value}</p>
    </Card>
  );
}

function TradeLogTab({ liveTrades, onTradeSubmit, skippedTradeIds }: {
  liveTrades: ReturnType<typeof useTrades>['trades'];
  onTradeSubmit: (data: TradeFormData) => void;
  skippedTradeIds?: Set<string>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteInitialData, setPasteInitialData] = useState<Partial<TradeFormData> | undefined>();
  const [filters, setFilters] = useState<TradeFilters>(defaultFilters);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hiddenColumns, setHiddenColumns] = useState<HiddenColumns>({ points: true, pl: true, setup: true });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const { deleteTrades } = useTrades();
  const settings = useSettings();

  const activeFilters = { ...filters, search };
  const filtered = useFilteredTrades(liveTrades, activeFilters);

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
    const csv = exportTradesToCSV(filtered, settings.customCategories || []);
    downloadCSV(csv, `trades-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showAddForm ? <ChevronUp size={16} /> : <PlusCircle size={16} />}
          {showAddForm ? 'Hide Form' : 'Add Trade'}
        </button>
        <button
          onClick={() => setPasteModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors"
        >
          <ClipboardPaste size={16} />
          Paste Trade
        </button>
        <div className="flex-1" />
        {selectedIds.size > 0 && (
          <Button variant="danger" size="sm" onClick={handleBulkDelete}>
            <Trash2 size={14} /> Delete ({selectedIds.size})
          </Button>
        )}
        <div className="relative">
          <Button variant="secondary" size="sm" onClick={() => setShowColumnMenu(v => !v)}>
            <Settings2 size={14} /> Columns
          </Button>
          {showColumnMenu && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-slate-800 border border-slate-600 rounded-lg p-2 shadow-lg space-y-1 min-w-[140px]">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-slate-100 px-1">
                <input type="checkbox" checked={!hiddenColumns.points} onChange={() => setHiddenColumns(h => ({ ...h, points: !h.points }))} className="rounded border-slate-600 bg-slate-800" />
                Points
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-slate-100 px-1">
                <input type="checkbox" checked={!hiddenColumns.pl} onChange={() => setHiddenColumns(h => ({ ...h, pl: !h.pl }))} className="rounded border-slate-600 bg-slate-800" />
                P&L
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-slate-100 px-1">
                <input type="checkbox" checked={!hiddenColumns.setup} onChange={() => setHiddenColumns(h => ({ ...h, setup: !h.setup }))} className="rounded border-slate-600 bg-slate-800" />
                Setup
              </label>
            </div>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={handleExportCSV}>
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {/* Inline trade form */}
      {showAddForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <TradeForm
            key={JSON.stringify(pasteInitialData)}
            initialData={pasteInitialData}
            onSubmit={(data) => {
              onTradeSubmit(data);
              setShowAddForm(false);
              setPasteInitialData(undefined);
            }}
            submitLabel="Save Trade"
          />
        </div>
      )}

      {/* Filter bar + search */}
      <FilterBar filters={filters} onChange={setFilters} />
      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search trades..."
          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Trade table */}
      {liveTrades.length === 0 ? (
        <EmptyState icon={<BookOpen size={48} />} title="No live trades yet" description="Click 'Add Trade' or 'Paste Trade' to get started." />
      ) : (
        <>
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
                    <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Grade</th>
                    <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">R</th>
                    {!hiddenColumns.points && <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Points</th>}
                    {!hiddenColumns.pl && <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">P&L</th>}
                    <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Result</th>
                    {!hiddenColumns.setup && <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Setup</th>}
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
                      hiddenColumns={hiddenColumns}
                      skipped={skippedTradeIds?.has(trade.id)}
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
            Showing {filtered.length} of {liveTrades.length} trade{liveTrades.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      <PasteTradeModal open={pasteModalOpen} onOpenChange={setPasteModalOpen} onParsed={(data) => {
        setPasteInitialData({
          direction: data.direction,
          entry: data.entry || '',
          stopLoss: data.stopLoss || '',
          takeProfit: data.takeProfit || '',
          exitPrice: data.exitPrice || '',
          result: data.result,
          date: data.date || '',
          time: data.time || '',
        });
        setShowAddForm(true);
      }} />
    </div>
  );
}

function AnalyticsTab({ advanced, tradeCount, planComparison }: { advanced: ReturnType<typeof useAdvancedStats>; tradeCount: number; planComparison?: TradingPlanComparison | null }) {
  const pl = usePLFormatter();

  if (tradeCount < 2) {
    return <EmptyState icon={<LineChartIcon size={48} />} title="Need more trades for analytics" description="Add at least 2 trades to see analytics." />;
  }

  const { performanceByInstrument, streaks, rollingWinRate } = advanced;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {planComparison && <BestVsFirstComparison comparison={planComparison} />}
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-4">Rolling Win Rate (10-trade)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={rollingWinRate}>
            <XAxis dataKey="tradeIndex" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Win Rate']}
            />
            <ReferenceLine y={50} stroke="#334155" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="winRate10" stroke="#818cf8" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-4">P&L by Instrument</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={performanceByInstrument}>
            <XAxis dataKey="instrument" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={pl.tickFormatter} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number | undefined) => [pl.tooltipFormatter(value ?? 0), 'P&L']}
            />
            <Bar dataKey="totalPL" radius={[4, 4, 0, 0]}>
              {performanceByInstrument.map((entry, i) => (
                <Cell key={i} fill={entry.totalPL >= 0 ? '#34d399' : '#fb7185'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="md:col-span-2">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Streak Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Longest Win Streak</p>
            <p className="text-lg font-bold text-emerald-400">{streaks.longestWin}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Longest Loss Streak</p>
            <p className="text-lg font-bold text-rose-400">{streaks.longestLoss}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Avg Win Streak</p>
            <p className="text-lg font-bold text-slate-50">{streaks.avgWinStreak.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Avg Loss Streak</p>
            <p className="text-lg font-bold text-slate-50">{streaks.avgLossStreak.toFixed(1)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
