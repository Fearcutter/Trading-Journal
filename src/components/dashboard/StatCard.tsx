import { type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  color?: 'default' | 'win' | 'loss';
  subValue?: string;
}

export default function StatCard({ label, value, icon, color = 'default', subValue }: StatCardProps) {
  const colorClass = color === 'win' ? 'text-emerald-400' : color === 'loss' ? 'text-rose-400' : 'text-slate-50';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <p className={`text-xl font-bold font-mono ${colorClass}`}>{value}</p>
      {subValue && <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>}
    </div>
  );
}
