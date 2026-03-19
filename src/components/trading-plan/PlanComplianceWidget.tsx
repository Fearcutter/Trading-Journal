import { useMemo } from 'react';
import type { Trade } from '../../types/trade';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import { calculatePlanCompliance } from '../../utils/trading-plan-filter';
import Card from '../ui/Card';

interface Props {
  trades: Trade[];
}

export default function PlanComplianceWidget({ trades }: Props) {
  const [n, setN] = useLocalStorage('plan-compliance-n', 2);
  const { plField, formatPLValue } = usePLFormatter();

  const compliance = useMemo(
    () => calculatePlanCompliance(trades, n, plField),
    [trades, n, plField],
  );

  if (trades.length === 0) return null;

  const { totalDays, compliantDays, compliancePercent, overtradedDays, extraTradesPL, avgExtraTradesPL, extraTradesCount } = compliance;

  // Green if extra trades are net-losing (plan protects you), amber if net-positive (leaving money)
  const extraTradesColor = extraTradesPL <= 0 ? 'text-emerald-400' : 'text-amber-400';
  const barColor = extraTradesPL <= 0 ? 'bg-emerald-500' : 'bg-amber-500';

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">Plan Compliance</h3>
        <select
          value={n}
          onChange={e => setN(Number(e.target.value))}
          className="bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-200 px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
            <option key={v} value={v}>
              {v} trade{v > 1 ? 's' : ''}/day
            </option>
          ))}
        </select>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-3 mb-3">
        <div
          className={`h-3 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(compliancePercent, 100)}%` }}
        />
      </div>

      <p className="text-sm text-slate-300 mb-2">
        You stuck to your plan ({n}/day) on <span className="font-semibold text-slate-50">{compliantDays}</span> of{' '}
        <span className="font-semibold text-slate-50">{totalDays}</span> trading days ({compliancePercent.toFixed(0)}%)
      </p>

      {overtradedDays > 0 && (
        <p className="text-sm text-slate-400">
          {extraTradesCount} extra trade{extraTradesCount !== 1 ? 's' : ''} across {overtradedDays} day{overtradedDays !== 1 ? 's' : ''}.
          Avg P&L from extra trades: <span className={`font-semibold ${extraTradesColor}`}>{formatPLValue(avgExtraTradesPL)}</span>
          {' '}(total: <span className={`font-semibold ${extraTradesColor}`}>{formatPLValue(extraTradesPL)}</span>)
        </p>
      )}
    </Card>
  );
}
