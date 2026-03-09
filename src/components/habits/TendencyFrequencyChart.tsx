import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useHabitCorrelation } from '../../hooks/useHabitCorrelation';
import { formatCurrency } from '../../utils/formatters';

export default function TendencyFrequencyChart() {
  const { tendencyCorrelations } = useHabitCorrelation();

  if (tendencyCorrelations.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Tendency Frequency</h3>
        <p className="text-xs text-slate-500">Log tendencies in your check-ins to see patterns.</p>
      </div>
    );
  }

  const data = tendencyCorrelations.map(t => ({
    name: t.tendency,
    count: t.count,
    avgPL: t.avgPL,
  }));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Tendency Frequency & Impact</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis
            type="number"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            labelStyle={{ color: '#f8fafc' }}
            formatter={((value: number | undefined, name: string | undefined) => {
              if (name === 'count') return [value ?? 0, 'Occurrences'];
              return [formatCurrency(value ?? 0), 'Avg P&L'];
            }) as never}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.avgPL >= 0 ? '#34d399' : '#f87171'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-3">
        {data.map(t => (
          <span key={t.name} className="text-[10px] text-slate-500">
            {t.name}: <span className={t.avgPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(t.avgPL)} avg</span>
          </span>
        ))}
      </div>
    </div>
  );
}
