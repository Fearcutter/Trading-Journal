import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import Card from '../ui/Card';
import { usePLFormatter } from '../../hooks/usePLFormatter';

interface Props {
  data: { hour: number; pl: number; count: number }[];
}

export default function TimeOfDayChart({ data }: Props) {
  const pl = usePLFormatter();

  const chartData = data.map(d => ({
    name: `${d.hour.toString().padStart(2, '0')}:00`,
    pl: d.pl,
    count: d.count,
  }));

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-4">P&L by Time of Day</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={pl.tickFormatter} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(value: number | undefined) => [
              pl.tooltipFormatter(value ?? 0),
              'P&L',
            ]}
          />
          <ReferenceLine y={0} stroke="#334155" />
          <Bar dataKey="pl" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.pl >= 0 ? '#34d399' : '#fb7185'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
