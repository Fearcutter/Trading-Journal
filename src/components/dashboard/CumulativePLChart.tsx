import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import Card from '../ui/Card';

interface Props {
  data: { date: string; pl: number }[];
}

export default function CumulativePLChart({ data }: Props) {
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-4">Cumulative P&L</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
          />
          <ReferenceLine y={0} stroke="#334155" />
          <Line type="monotone" dataKey="pl" stroke="#2dd4bf" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
