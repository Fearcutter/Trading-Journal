import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import Card from '../ui/Card';
import { usePLFormatter } from '../../hooks/usePLFormatter';

interface Props {
  data: { date: string; pl: number }[];
}

export default function CumulativePLChart({ data }: Props) {
  const pl = usePLFormatter();

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-4">Cumulative P&L</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={pl.tickFormatter} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number | undefined) => [pl.tooltipFormatter(value ?? 0), 'P&L']}
          />
          <ReferenceLine y={0} stroke="#334155" />
          <Line type="monotone" dataKey="pl" stroke="#2dd4bf" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
