import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FlaskConical, BarChart3, BookOpen, PlusCircle, LineChart as LineChartIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { useBacktest } from '../context/BacktestContext';
import { useTrades } from '../context/TradeContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useAdvancedStats } from '../hooks/useAdvancedStats';
import TradeForm from '../components/trade/TradeForm';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import type { TradeFormData } from '../types/trade';
import { formatCurrency, formatPercent, formatDate, formatTime } from '../utils/formatters';

const SESSION_DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
};

type Tab = 'dashboard' | 'tradelog' | 'newtrade' | 'analytics';

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'tradelog', label: 'Trade Log', icon: BookOpen },
  { key: 'newtrade', label: 'New Trade', icon: PlusCircle },
  { key: 'analytics', label: 'Analytics', icon: LineChartIcon },
];

export default function BacktestSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getSession } = useBacktest();
  const { trades, addTrade } = useTrades();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const session = sessionId ? getSession(sessionId) : undefined;

  const sessionTrades = useMemo(
    () => trades.filter(t => t.sessionId === sessionId).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.time || '').localeCompare(a.time || '');
    }),
    [trades, sessionId]
  );

  const dashboard = useDashboardStats(sessionTrades);
  const advanced = useAdvancedStats(sessionTrades);

  if (!session) {
    return (
      <div className="space-y-4">
        <Link to="/backtesting" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={16} /> Backtesting
        </Link>
        <EmptyState
          icon={<FlaskConical size={48} />}
          title="Session not found"
          description="This backtest session doesn't exist or has been deleted."
          action={<Link to="/backtesting" className="text-blue-400 hover:text-blue-300 text-sm">Back to Backtesting</Link>}
        />
      </div>
    );
  }

  const handleTradeSubmit = (data: TradeFormData) => {
    addTrade(data);
    toast.success('Trade saved to session!');
    setActiveTab('tradelog');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/backtesting" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-3">
          <ArrowLeft size={16} /> Backtesting
        </Link>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${SESSION_DOT_COLORS[session.color] || 'bg-blue-500'}`} />
          <h1 className="text-xl font-bold text-slate-50">{session.name}</h1>
          <span className="text-sm text-slate-500">{sessionTrades.length} trade{sessionTrades.length !== 1 ? 's' : ''}</span>
        </div>
        {session.description && (
          <p className="text-sm text-slate-400 mt-1 ml-6">{session.description}</p>
        )}
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
      {activeTab === 'dashboard' && <DashboardTab dashboard={dashboard} tradeCount={sessionTrades.length} />}
      {activeTab === 'tradelog' && <TradeLogTab trades={sessionTrades} />}
      {activeTab === 'newtrade' && (
        <div className="max-w-3xl">
          <TradeForm sessionId={sessionId} onSubmit={handleTradeSubmit} submitLabel="Save to Session" />
        </div>
      )}
      {activeTab === 'analytics' && <AnalyticsTab advanced={advanced} tradeCount={sessionTrades.length} />}
    </div>
  );
}

function DashboardTab({ dashboard, tradeCount }: { dashboard: ReturnType<typeof useDashboardStats>; tradeCount: number }) {
  if (tradeCount === 0) {
    return <EmptyState icon={<BarChart3 size={48} />} title="No trades yet" description="Add trades to this session to see statistics." />;
  }

  const { stats, cumulativePL } = dashboard;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatMini label="Total Trades" value={String(stats.totalTrades)} />
        <StatMini label="Win Rate" value={formatPercent(stats.winRate)} />
        <StatMini label="Total P&L" value={`${stats.totalPL >= 0 ? '+' : ''}${formatCurrency(stats.totalPL)}`} color={stats.totalPL > 0 ? 'text-emerald-400' : stats.totalPL < 0 ? 'text-rose-400' : undefined} />
        <StatMini label="Avg P&L" value={stats.totalTrades > 0 ? `${stats.totalPL / stats.totalTrades >= 0 ? '+' : ''}${formatCurrency(stats.totalPL / stats.totalTrades)}` : '$0.00'} color={stats.totalPL > 0 ? 'text-emerald-400' : stats.totalPL < 0 ? 'text-rose-400' : undefined} />
        <StatMini label="Profit Factor" value={stats.profitFactor === Infinity ? '---' : stats.profitFactor.toFixed(2)} />
      </div>
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-4">Cumulative P&L</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={cumulativePL}>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'P&L']}
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

function TradeLogTab({ trades }: { trades: ReturnType<typeof useTrades>['trades'] }) {
  if (trades.length === 0) {
    return <EmptyState icon={<BookOpen size={48} />} title="No trades in this session" description="Switch to the New Trade tab to add trades." />;
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
              <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Time</th>
              <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Instr.</th>
              <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Dir.</th>
              <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Entry</th>
              <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Exit</th>
              <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">P&L</th>
              <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Result</th>
              <th className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => (
              <tr key={trade.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                <td className="px-3 py-3 text-sm text-slate-300">{formatDate(trade.date)}</td>
                <td className="px-3 py-3 text-sm text-slate-400">{trade.time ? formatTime(trade.time) : '-'}</td>
                <td className="px-3 py-3 font-mono text-sm font-medium text-slate-200">{trade.instrument}</td>
                <td className="px-3 py-3">
                  <Badge variant={trade.direction === 'long' ? 'long' : 'short'}>{trade.direction.toUpperCase()}</Badge>
                </td>
                <td className="px-3 py-3 font-mono text-sm text-slate-300">{trade.entry.toFixed(2)}</td>
                <td className="px-3 py-3 font-mono text-sm text-slate-300">{trade.exitPrice.toFixed(2)}</td>
                <td className="px-3 py-3">
                  <span className={`font-mono text-sm font-medium ${trade.dollarPL > 0 ? 'text-emerald-400' : trade.dollarPL < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {trade.dollarPL > 0 ? '+' : ''}{formatCurrency(trade.dollarPL)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={trade.result === 'win' ? 'win' : trade.result === 'loss' ? 'loss' : 'breakeven'}>{trade.result.toUpperCase()}</Badge>
                </td>
                <td className="px-3 py-3">
                  <Link to={`/trades/${trade.id}`} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsTab({ advanced, tradeCount }: { advanced: ReturnType<typeof useAdvancedStats>; tradeCount: number }) {
  if (tradeCount < 2) {
    return <EmptyState icon={<LineChartIcon size={48} />} title="Need more trades for analytics" description="Add at least 2 trades to this session to see analytics." />;
  }

  const { performanceByInstrument, streaks, rollingWinRate } = advanced;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Rolling Win Rate */}
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

      {/* P&L by Instrument */}
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-4">P&L by Instrument</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={performanceByInstrument}>
            <XAxis dataKey="instrument" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'P&L']}
            />
            <Bar dataKey="totalPL" radius={[4, 4, 0, 0]}>
              {performanceByInstrument.map((entry, i) => (
                <Cell key={i} fill={entry.totalPL >= 0 ? '#34d399' : '#fb7185'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Streak Analysis */}
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
