import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface Props {
  data: { strategy: string; expectedDollar: number; avgR: number; diffFromBaseline: number }[];
}

export default function ExitStrategyChart({ data }: Props) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">Exit Strategy Comparison (Total R)</h3>
      {data.length === 0 ? (
        <p className="text-slate-500 text-sm">No trades with MFE data</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `${v.toFixed(1)}R`} />
            <YAxis type="category" dataKey="strategy" width={160} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm">
                    <p className="text-slate-300 font-medium mb-1">{d.strategy}</p>
                    <p className="text-slate-400">Total: <span className={d.expectedDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{d.expectedDollar.toFixed(2)}R</span></p>
                    <p className="text-slate-400">Avg: <span className={d.avgR >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{d.avgR.toFixed(2)}R</span>/trade</p>
                  </div>
                );
              }}
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
