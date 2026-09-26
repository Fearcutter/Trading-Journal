import Card from '../ui/Card';
import { THIN_SAMPLE_THRESHOLD, type MatrixRow, type MatrixCell, type SizeBand } from '../../utils/ifvg-sl-analyzer';

interface Props {
  rows: MatrixRow[];
  bands: SizeBand[];
}

/** Three intensity tiers so a +2R cell reads louder than a +0.2R one. */
function cellColour(avgR: number): string {
  const magnitude = Math.abs(avgR);
  const tier = magnitude < 0.5 ? 0 : magnitude <= 1.5 ? 1 : 2;
  const positive = [
    'bg-emerald-500/10 text-emerald-300',
    'bg-emerald-500/25 text-emerald-200',
    'bg-emerald-500/40 text-emerald-100',
  ];
  const negative = [
    'bg-rose-500/10 text-rose-300',
    'bg-rose-500/25 text-rose-200',
    'bg-rose-500/40 text-rose-100',
  ];
  if (avgR === 0) return 'bg-slate-700/40 text-slate-300';
  return avgR > 0 ? positive[tier] : negative[tier];
}

function Cell({ cell, best }: { cell: MatrixCell; best: boolean }) {
  if (cell.avgR === null) {
    return (
      <td className="px-4 py-3 text-center">
        <span className="text-slate-600">—</span>
      </td>
    );
  }
  return (
    <td className="px-2 py-2">
      <div
        className={`rounded-lg px-3 py-2 text-center ${cellColour(cell.avgR)} ${cell.thin ? 'opacity-50' : ''} ${best ? 'ring-2 ring-sky-400' : ''}`}
      >
        <p className="font-mono text-sm font-semibold">
          {cell.avgR > 0 ? '+' : ''}{cell.avgR.toFixed(2)}R{cell.thin ? '*' : ''}
        </p>
        <p className="text-[11px] opacity-70">{cell.count} {cell.count === 1 ? 'trade' : 'trades'}</p>
      </div>
    </td>
  );
}

export default function IFVGStopMethodGrid({ rows, bands }: Props) {
  // Best method per band, ignoring thin cells so a 3-trade fluke cannot win.
  const bestRowPerBand = bands.map((_, bandIdx) => {
    let bestIdx = -1;
    let bestR = -Infinity;
    rows.forEach((row, rowIdx) => {
      const cell = row.cells[bandIdx];
      if (cell.avgR === null || cell.thin) return;
      if (cell.avgR > bestR) {
        bestR = cell.avgR;
        bestIdx = rowIdx;
      }
    });
    return bestIdx;
  });

  return (
    <Card padding={false}>
      <div className="p-4 pb-0">
        <h3 className="text-sm font-medium text-slate-300">Average Realized R by Stop Method and iFVG Size</h3>
        <p className="text-xs text-slate-500 mt-1">
          Points made or lost divided by the distance risked. Ringed cell is the best method in that band.
        </p>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Stop Method</th>
              {bands.map(band => (
                <th key={band.label} className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {band.label} pts
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">All Sizes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.method} className="border-t border-slate-700">
                <td className="px-4 py-3 text-sm text-slate-200">{row.method}</td>
                {row.cells.map((cell, bandIdx) => (
                  <Cell key={bands[bandIdx].label} cell={cell} best={bestRowPerBand[bandIdx] === rowIdx} />
                ))}
                <Cell cell={row.all} best={false} />
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-500 mt-3">
          * Fewer than {THIN_SAMPLE_THRESHOLD} trades — shown faded, and never ringed as best. Treat as not yet meaningful.
        </p>
      </div>
    </Card>
  );
}
