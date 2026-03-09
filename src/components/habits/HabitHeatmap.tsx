import { useMemo, useState } from 'react';
import { format, subDays, getDay, parseISO } from 'date-fns';
import { useHabitStats } from '../../hooks/useHabitStats';

const CELL_SIZE = 12;
const CELL_GAP = 2;
const WEEKS = 52;
const DAYS = 7;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getColor(value: number): string {
  if (value === 0) return '#1e293b'; // slate-800
  if (value < 0.25) return '#064e3b'; // emerald-900
  if (value < 0.5) return '#047857'; // emerald-700
  if (value < 0.75) return '#059669'; // emerald-600
  if (value < 1) return '#34d399'; // emerald-400
  return '#6ee7b7'; // emerald-300
}

export default function HabitHeatmap() {
  const { heatmapData } = useHabitStats();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: number } | null>(null);

  const { cells, monthMarkers } = useMemo(() => {
    const today = new Date();
    const todayDay = getDay(today); // 0=Sun
    const cells: { x: number; y: number; date: string; value: number }[] = [];
    const monthMarkers: { x: number; label: string }[] = [];
    const seenMonths = new Set<string>();

    for (let week = WEEKS - 1; week >= 0; week--) {
      for (let day = 0; day < DAYS; day++) {
        const daysAgo = (WEEKS - 1 - week) * 7 + (todayDay - day + 7) % 7;
        if (week === WEEKS - 1 && day > todayDay) continue;

        const date = subDays(today, daysAgo);
        const dateStr = format(date, 'yyyy-MM-dd');
        const value = heatmapData.get(dateStr) || 0;
        const x = week * (CELL_SIZE + CELL_GAP);
        const y = day * (CELL_SIZE + CELL_GAP);

        cells.push({ x, y, date: dateStr, value });

        const monthKey = format(date, 'yyyy-MM');
        if (!seenMonths.has(monthKey) && day === 0) {
          seenMonths.add(monthKey);
          monthMarkers.push({ x, label: MONTH_LABELS[date.getMonth()] });
        }
      }
    }

    return { cells, monthMarkers };
  }, [heatmapData]);

  const svgWidth = WEEKS * (CELL_SIZE + CELL_GAP);
  const svgHeight = DAYS * (CELL_SIZE + CELL_GAP);
  const labelWidth = 28;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activity Heatmap</h3>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 overflow-x-auto">
        <div className="relative" style={{ minWidth: svgWidth + labelWidth }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ paddingLeft: labelWidth }}>
            {monthMarkers.map((m, i) => (
              <span
                key={i}
                className="text-[10px] text-slate-500 absolute"
                style={{ left: m.x + labelWidth }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <svg
            width={svgWidth + labelWidth}
            height={svgHeight + 16}
            className="mt-4"
          >
            {/* Day labels */}
            {DAY_LABELS.map((label, i) => (
              label && (
                <text
                  key={i}
                  x={0}
                  y={i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 1}
                  className="text-[10px] fill-slate-500"
                >
                  {label}
                </text>
              )
            ))}

            {/* Cells */}
            {cells.map((cell, i) => (
              <rect
                key={i}
                x={cell.x + labelWidth}
                y={cell.y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={getColor(cell.value)}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={e => {
                  const rect = (e.target as SVGRectElement).getBoundingClientRect();
                  setTooltip({ x: rect.left, y: rect.top, date: cell.date, value: cell.value });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-3 justify-end">
            <span className="text-[10px] text-slate-500 mr-1">Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map(v => (
              <div
                key={v}
                className="rounded-sm"
                style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: getColor(v) }}
              />
            ))}
            <span className="text-[10px] text-slate-500 ml-1">More</span>
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-200 pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y - 36 }}
          >
            {format(parseISO(tooltip.date), 'MMM d, yyyy')} — {Math.round(tooltip.value * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}
