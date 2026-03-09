import { useState } from 'react';
import { useApexAccounts } from '../../context/ApexAccountContext';
import { useTrades } from '../../context/TradeContext';
import { useApexPayoutStatus } from '../../hooks/useApexPayoutStatus';
import Card from '../ui/Card';
import ApexAccountDetail from './ApexAccountDetail';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function ApexPayoutWidget() {
  const { accounts } = useApexAccounts();
  const { trades } = useTrades();
  const statuses = useApexPayoutStatus(accounts, trades);
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);

  const activeAccounts = accounts.filter(a => a.status === 'active');
  if (activeAccounts.length === 0) return null;

  const selectedStatus = statuses.find(s => s.account.id === detailAccountId);

  const formatSize = (size: number) => {
    return size >= 1000 ? `${size / 1000}K` : `${size}`;
  };

  return (
    <>
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Apex PA Payouts</h3>
        <div className="space-y-3">
          {statuses.map(({ account, cycle, eligibility }) => (
            <button
              key={account.id}
              onClick={() => setDetailAccountId(account.id)}
              className="w-full text-left p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    {formatSize(account.accountSize)} {account.label}
                  </span>
                  {eligibility.eligible ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      <CheckCircle size={12} /> Ready
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-slate-500">
                  {eligibility.progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    eligibility.eligible ? 'bg-emerald-400' : eligibility.progress >= 60 ? 'bg-amber-400' : 'bg-blue-400'
                  }`}
                  style={{ width: `${eligibility.progress}%` }}
                />
              </div>

              {/* Stats line */}
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{cycle.tradingDaysCount}/8 days</span>
                <span className="text-slate-600">·</span>
                <span>{cycle.profitDaysCount}/5 profit days</span>
                <span className="text-slate-600">·</span>
                <span className={cycle.cushion < 500 ? 'text-rose-400' : cycle.cushion < 1000 ? 'text-amber-400' : 'text-slate-400'}>
                  ${cycle.cushion.toLocaleString(undefined, { maximumFractionDigits: 0 })} cushion
                </span>
              </div>

              {/* Warnings */}
              {cycle.consistencyViolations.length > 0 && (
                <div className="mt-1.5">
                  {cycle.consistencyViolations.map(v => (
                    <p key={v.date} className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={11} />
                      Consistency: {v.date} is {v.percentage.toFixed(0)}% of total
                    </p>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>

      {selectedStatus && (
        <ApexAccountDetail
          open={!!detailAccountId}
          onOpenChange={(open) => { if (!open) setDetailAccountId(null); }}
          status={selectedStatus}
        />
      )}
    </>
  );
}
