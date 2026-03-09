import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Trash2, Plus, X } from 'lucide-react';
import { useBacktest } from '../context/BacktestContext';
import { useTrades } from '../context/TradeContext';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import { formatPercent } from '../utils/formatters';
import { usePLFormatter, getTradeValue } from '../hooks/usePLFormatter';

const COLOR_OPTIONS = [
  { name: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500' },
  { name: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { name: 'violet', bg: 'bg-violet-500', ring: 'ring-violet-500' },
  { name: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500' },
  { name: 'rose', bg: 'bg-rose-500', ring: 'ring-rose-500' },
  { name: 'cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-500' },
];

const SESSION_DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
};

export default function BacktestingPage() {
  const { sessions, addSession, deleteSession } = useBacktest();
  const { trades } = useTrades();
  const settings = useSettings();
  const pl = usePLFormatter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instrument, setInstrument] = useState('');
  const [color, setColor] = useState('blue');

  const sessionStats = useMemo(() => {
    const map: Record<string, { count: number; wins: number; totalPL: number }> = {};
    for (const session of sessions) {
      map[session.id] = { count: 0, wins: 0, totalPL: 0 };
    }
    for (const trade of trades) {
      if (trade.sessionId && map[trade.sessionId]) {
        map[trade.sessionId].count++;
        if (trade.result === 'win') map[trade.sessionId].wins++;
        map[trade.sessionId].totalPL += getTradeValue(trade, pl.plField);
      }
    }
    return map;
  }, [sessions, trades, pl.plField]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addSession(name.trim(), description.trim(), instrument || undefined, color);
    setName('');
    setDescription('');
    setInstrument('');
    setColor('blue');
    setShowForm(false);
  };

  const handleDelete = (id: string, sessionName: string) => {
    if (!confirm(`Delete session "${sessionName}"? Trades in this session will not be deleted.`)) return;
    deleteSession(id);
  };

  const instrumentOptions = [
    { value: '', label: 'Any Instrument' },
    ...settings.instruments.map(i => ({ value: i.symbol, label: `${i.symbol} - ${i.name}` })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical size={24} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-50">Backtesting</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Session</>}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Session Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. NQ Breakout Strategy" required />
            <Select label="Instrument (optional)" value={instrument} onValueChange={setInstrument} options={instrumentOptions} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Describe what you're testing..."
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`w-7 h-7 rounded-full ${c.bg} transition-all ${color === c.name ? `ring-2 ${c.ring} ring-offset-2 ring-offset-slate-800` : 'opacity-50 hover:opacity-75'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm">Create Session</Button>
          </div>
        </form>
      )}

      {sessions.length === 0 && !showForm ? (
        <EmptyState
          icon={<FlaskConical size={48} />}
          title="No backtest sessions"
          description="Create a backtesting session to start testing strategies with simulated trades."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map(session => {
            const stats = sessionStats[session.id] || { count: 0, wins: 0, totalPL: 0 };
            const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
            return (
              <Link
                key={session.id}
                to={`/backtesting/${session.id}`}
                className="relative bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors group"
              >
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); handleDelete(session.id, session.name); }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${SESSION_DOT_COLORS[session.color] || 'bg-blue-500'}`} />
                  <h3 className="font-bold text-slate-50 truncate">{session.name}</h3>
                </div>
                {session.description && (
                  <p className="text-sm text-slate-400 truncate mb-3">{session.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>{stats.count} trade{stats.count !== 1 ? 's' : ''}</span>
                  <span>{formatPercent(winRate)} win</span>
                  <span className={stats.totalPL > 0 ? 'text-emerald-400' : stats.totalPL < 0 ? 'text-rose-400' : ''}>
                    {pl.formatPLValue(stats.totalPL)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
