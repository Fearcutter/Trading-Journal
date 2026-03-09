import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useHabitCorrelation } from '../../hooks/useHabitCorrelation';
import { formatCurrency } from '../../utils/formatters';

export default function HabitCorrelationChart() {
  const { habitCorrelations } = useHabitCorrelation();

  if (habitCorrelations.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Habit vs P&L Correlation</h3>
        <p className="text-xs text-slate-500">Complete check-ins on trading days to see correlations.</p>
      </div>
    );
  }

  const data = habitCorrelations.map(c => ({
    name: c.habitName.length > 20 ? c.habitName.substring(0, 18) + '...' : c.habitName,
    followed: c.avgPLWhenFollowed,
    notFollowed: c.avgPLWhenNotFollowed,
  }));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Habit vs P&L Correlation</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis
            type="number"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={v => formatCurrency(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            labelStyle={{ color: '#f8fafc' }}
            formatter={((value: number | undefined, name: string | undefined) => [formatCurrency(value ?? 0), name === 'followed' ? 'When Followed' : 'When Not Followed']) as never}
          />
          <Legend
            formatter={v => v === 'followed' ? 'When Followed' : 'When Not Followed'}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="followed" fill="#34d399" radius={[0, 4, 4, 0]} />
          <Bar dataKey="notFollowed" fill="#f87171" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
