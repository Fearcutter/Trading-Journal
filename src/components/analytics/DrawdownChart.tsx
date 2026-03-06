import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  data: { date: string; drawdown: number; cumPL: number }[];
}

export default function DrawdownChart({ data }: Props) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">Drawdown</h3>
      {data.length === 0 ? (
        <p className="text-slate-500 text-sm">No data available</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
