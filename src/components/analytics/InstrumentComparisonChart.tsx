import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { usePLFormatter } from '../../hooks/usePLFormatter';

interface Props {
  data: { instrument: string; totalPL: number; winRate: number; trades: number }[];
}

export default function InstrumentComparisonChart({ data }: Props) {
  const pl = usePLFormatter();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">Performance by Instrument</h3>
      {data.length === 0 ? (
        <p className="text-slate-500 text-sm">No data available</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="instrument" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(value: number | undefined, name: string | undefined) => {
                if (name === 'Win Rate %') return [`${(value ?? 0).toFixed(1)}%`, name];
                return [pl.tooltipFormatter(value ?? 0), pl.plLabel];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="totalPL" fill="#10b981" name={pl.plLabel} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="winRate" fill="#3b82f6" name="Win Rate %" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
