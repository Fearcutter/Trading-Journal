import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { usePLFormatter } from '../../hooks/usePLFormatter';

interface Props {
  simulations: number[][];
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
}

export default function MonteCarloChart({ simulations, percentiles }: Props) {
  const pl = usePLFormatter();

  if (simulations.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Monte Carlo Simulation</h3>
        <p className="text-slate-500 text-sm">No data available</p>
      </div>
    );
  }

  const numTrades = simulations[0]?.length || 0;
  const chartData = Array.from({ length: numTrades }, (_, i) => {
    const values = simulations.map(s => s[i]).sort((a, b) => a - b);
    const pct = (p: number) => values[Math.floor(values.length * p / 100)] || 0;
    return { trade: i, p5: pct(5), p25: pct(25), p50: pct(50), p75: pct(75), p95: pct(95) };
  });

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-1">Monte Carlo Simulation</h3>
      <p className="text-xs text-slate-500 mb-3">Final P&L range: {pl.tooltipFormatter(percentiles.p5)} (5th) to {pl.tooltipFormatter(percentiles.p95)} (95th)</p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="trade" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Trade #', fill: '#94a3b8', position: 'insideBottom', offset: -5 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
          <Area type="monotone" dataKey="p95" stroke="transparent" fill="#10b981" fillOpacity={0.1} />
          <Area type="monotone" dataKey="p75" stroke="transparent" fill="#10b981" fillOpacity={0.15} />
          <Area type="monotone" dataKey="p50" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
          <Area type="monotone" dataKey="p25" stroke="transparent" fill="#1e293b" fillOpacity={0.8} />
          <Area type="monotone" dataKey="p5" stroke="transparent" fill="#1e293b" fillOpacity={0.8} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
