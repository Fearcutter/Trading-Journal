import { useMemo } from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useHabits } from '../../context/HabitContext';
import { format, subDays, parseISO } from 'date-fns';

export default function DayRatingTrendWidget() {
  const { checkIns } = useHabits();

  const { chartData, avgRating, avgAdherence } = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, 29);
    const checkInMap = new Map(checkIns.map(c => [c.date, c]));

    const data: { date: string; label: string; rating: number | null; adherence: number | null }[] = [];
    let totalRating = 0;
    let ratingCount = 0;
    let totalAdherence = 0;
    let adherenceCount = 0;

    for (let i = 0; i < 30; i++) {
      const d = subDays(today, 29 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const checkIn = checkInMap.get(dateStr);

      let rating: number | null = null;
      let adherence: number | null = null;

      if (checkIn) {
        if (checkIn.dayRating > 0) {
          rating = checkIn.dayRating;
          totalRating += rating;
          ratingCount++;
        }
        if (checkIn.habitCompletions.length > 0) {
          const completed = checkIn.habitCompletions.filter(c => c.completed).length;
          adherence = Math.round((completed / checkIn.habitCompletions.length) * 100);
          totalAdherence += adherence;
          adherenceCount++;
        }
      }

      data.push({
        date: dateStr,
        label: format(d, 'MMM d'),
        rating,
        adherence,
      });
    }

    return {
      chartData: data,
      avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : '--',
      avgAdherence: adherenceCount > 0 ? Math.round(totalAdherence / adherenceCount) + '%' : '--',
    };
  }, [checkIns]);

  const hasData = chartData.some(d => d.rating !== null || d.adherence !== null);

  if (!hasData) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Day Rating & Adherence Trend</h3>
        <p className="text-xs text-slate-500">Complete check-ins to see trends over time.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Day Rating & Adherence Trend</h3>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="rating"
              domain={[0, 5]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="adherence"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number, name: string) => {
                if (name === 'rating') return [value, 'Rating'];
                return [value + '%', 'Adherence'];
              }}
            />
            <Area
              yAxisId="rating"
              type="monotone"
              dataKey="rating"
              stroke="#fbbf24"
              fill="url(#ratingGrad)"
              strokeWidth={2}
              connectNulls
              dot={false}
            />
            <Line
              yAxisId="adherence"
              type="monotone"
              dataKey="adherence"
              stroke="#60a5fa"
              strokeWidth={2}
              connectNulls
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-6 mt-2 text-xs text-slate-400">
        <div>
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />
          Avg Rating: <span className="text-slate-200 font-medium">{avgRating}</span>
        </div>
        <div>
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />
          Avg Adherence: <span className="text-slate-200 font-medium">{avgAdherence}</span>
        </div>
      </div>
    </div>
  );
}
