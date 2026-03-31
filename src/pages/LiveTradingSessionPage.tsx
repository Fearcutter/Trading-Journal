import { useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, TrendingUp, BarChart3, BookOpen, LineChart as LineChartIcon, Target, Layers, PlusCircle, ClipboardPaste, ChevronUp, Download, Trash2, Search, Settings2, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { useLiveSession } from '../context/LiveSessionContext';
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
import type { Trade, TradeFormData } from '../types/trade';
import { formatPercent } from '../utils/formatters';
import { usePLFormatter } from '../hooks/usePLFormatter';
import { useTradingPlanMode } from '../hooks/useTradingPlanMode';
import { useTradingPlanStats, type TradingPlanComparison } from '../hooks/useTradingPlanStats';
import TradingPlanToggle from '../components/trading-plan/TradingPlanToggle';
import ComparisonDashboard from '../components/trading-plan/ComparisonDashboard';
import MissedTradesBreakdown from '../components/trading-plan/MissedTradesBreakdown';
import BestVsFirstComparison from '../components/trading-plan/BestVsFirstComparison';
import { exportTradesToCSV, downloadCSV } from '../utils/csv-export';
import { useMFEMAEStats } from '../hooks/useMFEMAEStats';
import MFEMAEPanel from '../components/analytics/MFEMAEPanel';
import ConfluencesTab from '../components/confluences/ConfluencesTab';

const SESSION_DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
};

type Tab = 'dashboard' | 'tradelog' | 'analytics' | 'confluences' | 'mfe-mae';

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'tradelog', label: 'Trade Log', icon: BookOpen },
  { key: 'analytics', label: 'Analytics', icon: LineChartIcon },
  { key: 'confluences', label: 'Confluences', icon: Layers },
  { key: 'mfe-mae', label: 'MFE / MAE', icon: Target },
];

export default function LiveTradingSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getSession, updateSession, loading } = useLiveSession();
  const { trades, addTrade } = useTrades();
  const { accounts } = useApexAccounts();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as Tab) || 'dashboard';
  const setActiveTab = (tab: Tab) => setSearchParams(tab === 'dashboard' ? {} : { tab }, { replace: true });

  const session = sessionId ? getSession(sessionId) : undefined;

  const sessionTrades = useMemo(
    () => trades.filter(t => t.sessionId === sessionId).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.time || '').localeCompare(a.time || '');
    }),
    [trades, sessionId]
  );

  const { plField } = usePLFormatter();
  const { planState, setEnabled, setTradesPerDay } = useTradingPlanMode(sessionId!);
  const planComparison = useTradingPlanStats(sessionTrades, planState, plField);
  const activeTrades = planState.enabled && planComparison ? planComparison.planTrades : sessionTrades;
  const dashboard = useDashboardStats(activeTrades, plField);
  const advanced = useAdvancedStats(activeTrades, plField);
  const mfeStats = useMFEMAEStats(activeTrades, plField);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  if (loading) return null;

  if (!session) {
    return (
      <div className="space-y-4">
        <Link to="/live-trading" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={16} /> Live Trading
        </Link>
        <EmptyState
          icon={<TrendingUp size={48} />}
          title="Session not found"
          description="This live trading session doesn't exist or has been deleted."
          action={<Link to="/live-trading" className="text-blue-400 hover:text-blue-300 text-sm">Back to Live Trading</Link>}
        />
      </div>
    );
  }

  const startEditing = () => {
    setNameValue(session.name);
    setEditingName(true);
  };

  const saveName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== session.name) {
      updateSession(sessionId!, { name: trimmed });
    }
    setEditingName(false);
  };

  const handleTradeSubmit = (data: TradeFormData) => {
    const trade = addTrade({ ...data, sessionId: sessionId! });
    toast.success('Trade saved to session!');

    if (trade.accountIds?.length) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/live-trading" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-3">
          <ArrowLeft size={16} /> Live Trading
        </Link>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${SESSION_DOT_COLORS[session.color] || 'bg-blue-500'}`} />
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                className="text-xl font-bold text-slate-50 bg-slate-800 border border-slate-600 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={saveName} className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"><Check size={16} /></button>
              <button onClick={() => setEditingName(false)} className="p-1 text-slate-400 hover:text-slate-300 transition-colors"><X size={16} /></button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-50">{session.name}</h1>
              <button onClick={startEditing} className="p-1 text-slate-500 hover:text-slate-300 transition-colors"><Pencil size={14} /></button>
            </>
          )}
          <span className="text-sm text-slate-500">{sessionTrades.length} trade{sessionTrades.length !== 1 ? 's' : ''}</span>
        </div>
        {session.description && (
          <p className="text-sm text-slate-400 mt-1 ml-6">{session.description}</p>
        )}
        <TradingPlanToggle planState={planState} onToggle={setEnabled} onChangeN={setTradesPerDay} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-700 pb-px">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
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

      {/* Tab content */}
      {activeTab === 'dashboard' && <DashboardTab dashboard={dashboard} tradeCount={activeTrades.length} planComparison={planComparison} />}
      {activeTab === 'tradelog' && (
        <TradeLogTab
          sessionTrades={sessionTrades}
          sessionId={sessionId!}
          onTradeSubmit={handleTradeSubmit}
          skippedTradeIds={planComparison?.skippedTradeIds}
        />
      )}
      {activeTab === 'analytics' && <AnalyticsTab advanced={advanced} trades={activeTrades} tradeCount={activeTrades.length} planComparison={planComparison} />}
      {activeTab === 'confluences' && <ConfluencesTab trades={activeTrades} />}
      {activeTab === 'mfe-mae' && (
        activeTrades.length === 0
          ? <EmptyState icon={<Target size={48} />} title="No trades yet" description="Add trades to this session to see MFE/MAE analysis." />
          : <MFEMAEPanel trades={activeTrades} stats={mfeStats} />
      )}
    </div>
  );
}

function DashboardTab({ dashboard, tradeCount, planComparison }: { dashboard: ReturnType<typeof useDashboardStats>; tradeCount: number; planComparison?: TradingPlanComparison | null }) {
  const pl = usePLFormatter();

  if (tradeCount === 0) {
    return <EmptyState icon={<BarChart3 size={48} />} title="No trades yet" description="Add trades to see statistics." />;
  }

  const { stats, cumulativePL, plByRMultiple, cumulativePLByRMultiple } = dashboard;

  const R_COLORS = { loss: '#f87171', r1: '#fbbf24', r1_5: '#fb923c', r2: '#a78bfa', r2_5: '#38bdf8', r3: '#34d399', r4plus: '#86efac' } as const;
  const R_TEXT_COLORS = { loss: 'text-rose-400', r1: 'text-amber-400', r1_5: 'text-orange-400', r2: 'text-violet-400', r2_5: 'text-sky-400', r3: 'text-emerald-400', r4plus: 'text-green-300' } as const;
  const [visibleRLines, setVisibleRLines] = useState<Record<string, boolean>>({ loss: true, r1: true, r1_5: true, r2: true, r2_5: true, r3: true, r4plus: true });

  const toggleRLine = (key: string) => setVisibleRLines(prev => ({ ...prev, [key]: !prev[key] }));

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
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {plByRMultiple.map(({ bucket, label, pl: bucketPL, count }) => (
          <StatMini key={bucket} label={`${label} (${count})`} value={pl.formatPLValue(bucketPL)} color={R_TEXT_COLORS[bucket as keyof typeof R_TEXT_COLORS]} />
        ))}
      </div>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-300">Cumulative P&L by R Multiple</h3>
          <div className="flex gap-2 flex-wrap justify-end">
            {plByRMultiple.map(({ bucket, label }) => (
              <button
                key={bucket}
                onClick={() => toggleRLine(bucket)}
                className={`px-2 py-0.5 rounded text-xs font-medium border transition-opacity ${visibleRLines[bucket] ? 'opacity-100' : 'opacity-30'}`}
                style={{ borderColor: R_COLORS[bucket], color: R_COLORS[bucket] }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={cumulativePLByRMultiple}>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={pl.tickFormatter} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number, name: string) => [pl.tooltipFormatter(value ?? 0), name]}
            />
            <ReferenceLine y={0} stroke="#334155" />
            {visibleRLines.loss && <Line type="monotone" dataKey="loss" name="Loss" stroke={R_COLORS.loss} strokeWidth={2} dot={false} />}
            {visibleRLines.r1 && <Line type="monotone" dataKey="r1" name="1R" stroke={R_COLORS.r1} strokeWidth={2} dot={false} />}
            {visibleRLines.r1_5 && <Line type="monotone" dataKey="r1_5" name="1.5R" stroke={R_COLORS.r1_5} strokeWidth={2} dot={false} />}
            {visibleRLines.r2 && <Line type="monotone" dataKey="r2" name="2R" stroke={R_COLORS.r2} strokeWidth={2} dot={false} />}
            {visibleRLines.r2_5 && <Line type="monotone" dataKey="r2_5" name="2.5R" stroke={R_COLORS.r2_5} strokeWidth={2} dot={false} />}
            {visibleRLines.r3 && <Line type="monotone" dataKey="r3" name="3R" stroke={R_COLORS.r3} strokeWidth={2} dot={false} />}
            {visibleRLines.r4plus && <Line type="monotone" dataKey="r4plus" name="4R+" stroke={R_COLORS.r4plus} strokeWidth={2} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-4">Cumulative P&L</h3>
        <ResponsiveContainer width="100%" height={200}>
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

function TradeLogTab({ sessionTrades, sessionId, onTradeSubmit, skippedTradeIds }: {
  sessionTrades: ReturnType<typeof useTrades>['trades'];
  sessionId: string;
  onTradeSubmit: (data: TradeFormData) => void;
  skippedTradeIds?: Set<string>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteInitialData, setPasteInitialData] = useState<Partial<TradeFormData> | undefined>();
  const storageKey = `tradeLogFilters:live-session:${sessionId}`;
  const [filters, _setFilters] = useState<TradeFilters>(() => {
    try { const s = sessionStorage.getItem(storageKey); return s ? JSON.parse(s).filters ?? defaultFilters : defaultFilters; } catch { return defaultFilters; }
  });
  const [search, _setSearch] = useState(() => {
    try { const s = sessionStorage.getItem(storageKey); return s ? JSON.parse(s).search ?? '' : ''; } catch { return ''; }
  });
  const setFilters = (update: TradeFilters | ((prev: TradeFilters) => TradeFilters)) => {
    _setFilters(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      try { const s = JSON.parse(sessionStorage.getItem(storageKey) || '{}'); sessionStorage.setItem(storageKey, JSON.stringify({ ...s, filters: next })); } catch {}
      return next;
    });
  };
  const setSearch = (v: string) => {
    _setSearch(v);
    try { const s = JSON.parse(sessionStorage.getItem(storageKey) || '{}'); sessionStorage.setItem(storageKey, JSON.stringify({ ...s, search: v })); } catch {}
  };
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hiddenColumns, setHiddenColumns] = useState<HiddenColumns>({ points: true, pl: true, setup: true });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const { deleteTrades } = useTrades();
  const settings = useSettings();

  const activeFilters = { ...filters, search };
  const filtered = useFilteredTrades(sessionTrades, activeFilters);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(t => t.id)));
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
              {(['points', 'pl', 'setup', 'reached2R', 'reached3R'] as const).map(col => (
                <label key={col} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-slate-100 px-1">
                  <input type="checkbox" checked={!hiddenColumns[col]} onChange={() => setHiddenColumns(h => ({ ...h, [col]: !h[col] }))} className="rounded border-slate-600 bg-slate-800" />
                  {col === 'reached2R' ? '2R' : col === 'reached3R' ? '3R' : col.charAt(0).toUpperCase() + col.slice(1)}
                </label>
              ))}
            </div>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={handleExportCSV}>
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <TradeForm
            key={JSON.stringify(pasteInitialData)}
            initialData={pasteInitialData}
            sessionId={sessionId}
            onSubmit={(data) => {
              onTradeSubmit(data);
              setShowAddForm(false);
              setPasteInitialData(undefined);
            }}
            submitLabel="Save Trade"
          />
        </div>
      )}

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

      {sessionTrades.length === 0 ? (
        <EmptyState icon={<BookOpen size={48} />} title="No trades in this session" description="Click 'Add Trade' or 'Paste Trade' to get started." />
      ) : (
        <>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 text-left">
                    <th className="px-3 py-3">
                      <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} className="rounded border-slate-600 bg-slate-800" />
                    </th>
                    <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Instr.</th>
                    <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Dir.</th>
                    <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Grade</th>
                    <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">R</th>
                    {!hiddenColumns.reached2R && <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-center">2R</th>}
                    {!hiddenColumns.reached3R && <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-center">3R</th>}
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
              <div className="py-12 text-center text-sm text-slate-500">No trades match your filters.</div>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Showing {filtered.length} of {sessionTrades.length} trade{sessionTrades.length !== 1 ? 's' : ''}
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

function AnalyticsTab({ advanced, trades, tradeCount, planComparison }: { advanced: ReturnType<typeof useAdvancedStats>; trades: Trade[]; tradeCount: number; planComparison?: TradingPlanComparison | null }) {
  const mfeReachData = useMemo(() => {
    const thresholds = [1, 1.5, 2, 2.5, 3];
    const tradesWithMFE = trades.filter(t => t.mfe != null && Math.abs(t.entry - t.stopLoss) > 0);
    if (tradesWithMFE.length === 0) return null;
    return {
      total: tradesWithMFE.length,
      rows: thresholds.map(r => {
        const wins = tradesWithMFE.filter(t => t.mfe! >= r * Math.abs(t.entry - t.stopLoss));
        const losses = tradesWithMFE.filter(t => t.mfe! < Math.abs(t.entry - t.stopLoss));
        return {
          threshold: `${r}R`,
          wins: wins.length,
          losses: losses.length,
          be: tradesWithMFE.length - wins.length - losses.length,
          netR: (wins.length * r) - losses.length,
          rawWinRate: (wins.length / tradesWithMFE.length) * 100,
          trueWinRate: wins.length + losses.length > 0 ? (wins.length / (wins.length + losses.length)) * 100 : 0,
        };
      }),
    };
  }, [trades]);

  if (tradeCount < 2) {
    return <EmptyState icon={<LineChartIcon size={48} />} title="Need more trades for analytics" description="Add at least 2 trades to see analytics." />;
  }

  const { streaks } = advanced;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {planComparison && <BestVsFirstComparison comparison={planComparison} />}
      {mfeReachData && (
        <Card className="md:col-span-2">
          <h3 className="text-sm font-medium text-slate-300 mb-4">MFE Reach Analysis <span className="text-slate-500 font-normal">({mfeReachData.total} trades)</span></h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Threshold</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">W</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">BE</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">L</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Net R</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Raw WR</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">True WR</th>
                </tr>
              </thead>
              <tbody>
                {mfeReachData.rows.map(row => (
                  <tr key={row.threshold} className="border-b border-slate-700/50">
                    <td className="px-3 py-2 text-sm font-mono font-medium text-slate-200">{row.threshold}</td>
                    <td className="px-3 py-2 text-sm text-center text-emerald-400">{row.wins}</td>
                    <td className="px-3 py-2 text-sm text-center text-amber-400">{row.be}</td>
                    <td className="px-3 py-2 text-sm text-center text-rose-400">{row.losses}</td>
                    <td className="px-3 py-2 text-sm text-center">
                      <span className={`font-mono font-medium ${row.netR > 0 ? 'text-emerald-400' : row.netR < 0 ? 'text-rose-400' : 'text-slate-200'}`}>{row.netR > 0 ? '+' : ''}{row.netR % 1 === 0 ? row.netR.toFixed(0) : row.netR.toFixed(1)}R</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center font-mono font-medium text-slate-200">{row.rawWinRate.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-sm text-center font-mono font-medium text-slate-200">{row.trueWinRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card className="md:col-span-2">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Streak Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-slate-500">Longest Win Streak</p><p className="text-lg font-bold text-emerald-400">{streaks.longestWin}</p></div>
          <div><p className="text-xs text-slate-500">Longest Loss Streak</p><p className="text-lg font-bold text-rose-400">{streaks.longestLoss}</p></div>
          <div><p className="text-xs text-slate-500">Avg Win Streak</p><p className="text-lg font-bold text-slate-50">{streaks.avgWinStreak.toFixed(1)}</p></div>
          <div><p className="text-xs text-slate-500">Avg Loss Streak</p><p className="text-lg font-bold text-slate-50">{streaks.avgLossStreak.toFixed(1)}</p></div>
        </div>
      </Card>
    </div>
  );
}
