import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useHabitCorrelation } from '../../hooks/useHabitCorrelation';
import { format, parseISO } from 'date-fns';

export default function AdherenceOverTimeChart() {
  const { adherenceTimeSeries } = useHabitCorrelation();

  if (adherenceTimeSeries.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Adherence Over Time</h3>
        <p className="text-xs text-slate-500">Complete check-ins over multiple weeks to see trends.</p>
      </div>
    );
  }

  const data = adherenceTimeSeries.map(w => ({
    week: format(parseISO(w.weekStart), 'MMM d'),
    adherence: Math.round(w.adherenceRate * 100),
  }));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Weekly Adherence Rate</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ left: 0, right: 10, top: 5 }}>
          <XAxis
            dataKey="week"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={v => `${v}%`}
            width={45}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            labelStyle={{ color: '#f8fafc' }}
            formatter={(value: number) => [`${value}%`, 'Adherence']}
          />
          <Line
            type="monotone"
            dataKey="adherence"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ fill: '#34d399', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
