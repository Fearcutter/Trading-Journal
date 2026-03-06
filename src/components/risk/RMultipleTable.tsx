import { useMemo } from 'react';

interface Props {
  stopDistance: number;
  pointValue: number;
}

const R_MULTIPLES = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

export default function RMultipleTable({ stopDistance, pointValue }: Props) {
  const rows = useMemo(() =>
    R_MULTIPLES.map(r => ({
      r,
      points: (stopDistance * r).toFixed(2),
      dollarPL: (stopDistance * r * pointValue).toFixed(2),
    })),
    [stopDistance, pointValue]
  );

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
      <h2 className="text-lg font-semibold text-slate-50 mb-4">R-Multiple Table</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 border-b border-slate-700">
            <th className="text-left py-2 font-medium">R-Multiple</th>
            <th className="text-right py-2 font-medium">Points</th>
            <th className="text-right py-2 font-medium">$ P&L / Contract</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.r} className="border-b border-slate-700/50">
              <td className="py-2 text-slate-50 font-medium">{row.r}R</td>
              <td className="py-2 text-right text-slate-300">{row.points}</td>
              <td className="py-2 text-right text-green-400 font-medium">${row.dollarPL}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
