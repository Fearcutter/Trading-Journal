import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ZAxis, ReferenceLine, Legend } from 'recharts';
import Card from '../ui/Card';
import type { ScatterPoint } from '../../utils/ifvg-sl-analyzer';

interface Props {
  points: ScatterPoint[];
  lo: number;
  hi: number;
}

const METHOD_COLOURS = ['#38bdf8', '#f472b6', '#a78bfa', '#fbbf24', '#34d399', '#fb7185', '#60a5fa', '#f97316'];

interface TooltipPayload { payload: ScatterPoint }

function PointTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-200 font-medium">{p.method}</p>
      <p className="text-slate-400">{p.date} · {p.instrument}</p>
      <p className="text-slate-300 font-mono mt-1">
        {p.size} pt gap · {p.r > 0 ? '+' : ''}{p.r.toFixed(2)}R
      </p>
    </div>
  );
}

export default function IFVGStopMethodScatter({ points, lo, hi }: Props) {
  const methods = [...new Set(points.map(p => p.method))].sort();
  const [low, high] = lo <= hi ? [lo, hi] : [hi, lo];

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300">Every Trade by Gap Size and Realized R</h3>
      <p className="text-xs text-slate-500 mt-1 mb-3">
        Each dot is one trade. Dashed lines are your cutoffs — check the dots actually separate before trusting a band.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            type="number"
            dataKey="size"
            name="iFVG size"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'iFVG Size (pts)', fill: '#94a3b8', position: 'insideBottom', offset: -8 }}
          />
          <YAxis
            type="number"
            dataKey="r"
            name="Realized R"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Realized R', fill: '#94a3b8', angle: -90, position: 'insideLeft' }}
          />
          <ZAxis range={[45, 45]} />
          <Tooltip content={<PointTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          <ReferenceLine y={0} stroke="#64748b" />
          <ReferenceLine x={low} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: String(low), fill: '#94a3b8', fontSize: 11, position: 'top' }} />
          <ReferenceLine x={high} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: String(high), fill: '#94a3b8', fontSize: 11, position: 'top' }} />
          {methods.map((method, i) => (
            <Scatter
              key={method}
              name={method}
              data={points.filter(p => p.method === method)}
              fill={METHOD_COLOURS[i % METHOD_COLOURS.length]}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}
