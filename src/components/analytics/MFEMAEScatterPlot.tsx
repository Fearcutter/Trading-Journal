import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ZAxis } from 'recharts';
import type { Trade } from '../../types/trade';

interface Props {
  trades: Trade[];
}

export default function MFEMAEScatterPlot({ trades }: Props) {
  const withData = trades.filter(t => t.mae != null && t.mfe != null);
  const wins = withData.filter(t => t.result === 'win').map(t => ({ mae: t.mae, mfe: t.mfe, pl: t.dollarPL }));
  const losses = withData.filter(t => t.result !== 'win').map(t => ({ mae: t.mae, mfe: t.mfe, pl: t.dollarPL }));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">MFE vs MAE Scatter Plot</h3>
      {withData.length === 0 ? (
        <p className="text-slate-500 text-sm">No trades with MFE/MAE data</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" dataKey="mae" name="MAE" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'MAE (pts)', fill: '#94a3b8', position: 'insideBottom', offset: -5 }} />
            <YAxis type="number" dataKey="mfe" name="MFE" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'MFE (pts)', fill: '#94a3b8', angle: -90, position: 'insideLeft' }} />
            <ZAxis range={[40, 40]} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            <Scatter name="Wins" data={wins} fill="#10b981" />
            <Scatter name="Losses" data={losses} fill="#f43f5e" />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
