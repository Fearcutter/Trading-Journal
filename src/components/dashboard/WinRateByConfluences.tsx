import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import Card from '../ui/Card';

interface Props {
  data: { count: number; winRate: number; total: number }[];
}

export default function WinRateByConfluences({ data }: Props) {
  const chartData = data.map(d => ({
    name: `${d.count} conf.`,
    winRate: Math.round(d.winRate * 10) / 10,
    total: d.total,
  }));

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-4">Win Rate by # Confluences</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(value: number | undefined) => [
              `${(value ?? 0).toFixed(1)}%`,
              'Win Rate',
            ]}
          />
          <Bar dataKey="winRate" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
