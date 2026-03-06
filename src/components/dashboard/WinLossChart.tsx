import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import Card from '../ui/Card';

interface Props {
  wins: number;
  losses: number;
  breakeven: number;
}

const COLORS = ['#34d399', '#fb7185', '#fbbf24'];

export default function WinLossChart({ wins, losses, breakeven }: Props) {
  const data = [
    { name: 'Wins', value: wins },
    { name: 'Losses', value: losses },
    { name: 'Breakeven', value: breakeven },
  ].filter(d => d.value > 0);

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-4">Win/Loss Distribution</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, name ?? '']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
            {d.name} ({d.value})
          </div>
        ))}
      </div>
    </Card>
  );
}
