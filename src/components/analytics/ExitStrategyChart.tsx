import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { usePLFormatter } from '../../hooks/usePLFormatter';

interface Props {
  data: { strategy: string; expectedDollar: number; diffFromBaseline: number }[];
}

export default function ExitStrategyChart({ data }: Props) {
  const pl = usePLFormatter();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">Exit Strategy Comparison</h3>
      {data.length === 0 ? (
        <p className="text-slate-500 text-sm">No trades with MFE data</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis type="category" dataKey="strategy" width={160} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(value: number | undefined) => [pl.tooltipFormatter(value ?? 0), 'Expected']}
            />
            <Bar dataKey="expectedDollar" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.expectedDollar >= 0 ? '#10b981' : '#f43f5e'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
