import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface Props {
  data: { type: 'win' | 'loss'; length: number; pl: number }[];
}

export default function StreakChart({ data }: Props) {
  const chartData = data.map((s, i) => ({
    index: i + 1,
    length: s.type === 'win' ? s.length : -s.length,
    type: s.type,
    pl: s.pl,
  }));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">Win/Loss Streaks</h3>
      {chartData.length === 0 ? (
        <p className="text-slate-500 text-sm">No data available</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="index" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Streak #', fill: '#94a3b8', position: 'insideBottom', offset: -5 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(value: number | undefined) => [Math.abs(value ?? 0), 'Length']}
            />
            <Bar dataKey="length" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.type === 'win' ? '#10b981' : '#f43f5e'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
