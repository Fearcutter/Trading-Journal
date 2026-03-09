import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import Card from '../ui/Card';
import { usePLFormatter } from '../../hooks/usePLFormatter';

interface Props {
  data: Record<string, number>;
}

export default function PLBySetupChart({ data }: Props) {
  const pl = usePLFormatter();

  const chartData = Object.entries(data)
    .map(([name, plVal]) => ({ name, pl: plVal }))
    .sort((a, b) => b.pl - a.pl);

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-4">P&L by Setup Type</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={pl.tickFormatter} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={120} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(value: number | undefined) => [pl.tooltipFormatter(value ?? 0), 'P&L']}
          />
          <ReferenceLine x={0} stroke="#334155" />
          <Bar dataKey="pl" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.pl >= 0 ? '#34d399' : '#fb7185'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
