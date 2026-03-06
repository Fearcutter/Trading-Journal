import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface Props {
  data: Record<string, number | string>[];
}

const colors: Record<string, string> = {
  winRate10: '#10b981',
  winRate20: '#3b82f6',
  winRate50: '#f59e0b',
};

export default function RollingWinRateChart({ data }: Props) {
  const windows = Object.keys(data[0] || {}).filter(k => k.startsWith('winRate'));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">Rolling Win Rate</h3>
      {data.length === 0 ? (
        <p className="text-slate-500 text-sm">No data available</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="tradeIndex" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            <Legend />
            {windows.map(w => (
              <Line key={w} type="monotone" dataKey={w} stroke={colors[w] || '#10b981'} dot={false} strokeWidth={2} name={w.replace('winRate', '') + ' trades'} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
