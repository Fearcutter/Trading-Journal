import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useApexAccounts } from '../../context/ApexAccountContext';
import type { ApexPayoutStatus } from '../../hooks/useApexPayoutStatus';
import { CheckCircle, XCircle, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApexAccountDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: ApexPayoutStatus;
}

export default function ApexAccountDetail({ open, onOpenChange, status }: ApexAccountDetailProps) {
  const { recordPayout } = useApexAccounts();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  const { account, cycle, eligibility } = status;
  const minProfitDay = account.ruleSet === 'legacy' ? 50 : 100;
  const consistencyApplies = account.ruleSet === 'legacy' && account.payoutsCompleted < 6;

  const handleRecordPayout = () => {
    const amount = Number(payoutAmount);
    if (!amount || amount < 500) {
      toast.error('Minimum payout is $500');
      return;
    }
    recordPayout(account.id, amount);
    toast.success(`Payout recorded for ${account.label}`);
    setPayoutAmount('');
    setShowPayoutForm(false);
  };

  const formatSize = (size: number) => size >= 1000 ? `${size / 1000}K` : `${size}`;

  // Cushion as percentage of initial drawdown limit
  const cushionPct = account.drawdownLimit > 0
    ? Math.round((cycle.cushion / account.drawdownLimit) * 100)
    : 100;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`${formatSize(account.accountSize)} ${account.label}`} wide>
      <div className="space-y-5">
        {/* Account info */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-700/30 rounded-lg p-2.5">
            <p className="text-xs text-slate-500">Balance</p>
            <p className={`text-lg font-bold font-mono ${cycle.currentBalance >= account.initialBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${cycle.currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-2.5">
            <p className="text-xs text-slate-500">Payouts</p>
            <p className="text-lg font-bold text-slate-50">{account.payoutsCompleted}/6</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-2.5">
            <p className="text-xs text-slate-500">Trading Days</p>
            <p className="text-lg font-bold text-slate-50">{cycle.tradingDaysCount}/8</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-2.5">
            <p className="text-xs text-slate-500">Profit Days</p>
            <p className="text-lg font-bold text-slate-50">{cycle.profitDaysCount}/5</p>
          </div>
        </div>

        {/* Drawdown cushion bar */}
        <div className="bg-slate-700/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Drawdown Cushion</span>
            <span className={`text-xs font-medium ${cushionPct < 33 ? 'text-rose-400' : cushionPct < 66 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {cushionPct}%
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${cushionPct < 33 ? 'bg-rose-400' : cushionPct < 66 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.max(0, Math.min(100, cushionPct))}%` }}
            />
          </div>
          <div className="flex items-center justify-end mt-1">
            <span className="text-xs text-slate-500 capitalize">{account.ruleSet}</span>
          </div>
        </div>

        {/* Rule checklist */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payout Rules</h4>
          <div className="space-y-1.5">
            <RuleCheck
              passed={cycle.tradingDaysCount >= 8}
              label={`8 trading days (${cycle.tradingDaysCount}/8)`}
            />
            <RuleCheck
              passed={cycle.profitDaysCount >= 5}
              label={`5 profit days ($${minProfitDay}+) (${cycle.profitDaysCount}/5)`}
            />
            <RuleCheck
              passed={cycle.totalProfit >= 500}
              label={`Minimum $500 profit ($${cycle.totalProfit.toFixed(0)})`}
            />
            {consistencyApplies && (
              <RuleCheck
                passed={cycle.consistencyViolations.length === 0}
                label={`30% consistency rule${cycle.consistencyViolations.length > 0 ? ` — ${cycle.consistencyViolations.length} violation(s)` : ''}`}
              />
            )}
            {account.ruleSet === 'legacy' && (
              <RuleCheck
                passed={cycle.inPayoutWindow}
                label={`In payout window (1st-5th or 15th-20th)${!cycle.inPayoutWindow && cycle.nextWindowStart ? ` — next: ${cycle.nextWindowStart}` : ''}`}
              />
            )}
          </div>
        </div>

        {/* Day-by-day breakdown */}
        {cycle.tradingDays.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Daily Breakdown</h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {cycle.tradingDays.map(day => {
                const isProfitDay = day.dollarPL >= minProfitDay;
                const isConsistencyViolation = consistencyApplies && cycle.totalProfit > 0 && day.dollarPL > cycle.totalProfit * 0.3;
                return (
                  <div
                    key={day.date}
                    className={`flex items-center justify-between px-3 py-1.5 rounded text-sm ${
                      isConsistencyViolation ? 'bg-amber-400/10 border border-amber-400/20' : 'bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-xs">{day.date}</span>
                      <span className="text-xs text-slate-500">{day.tradeCount} trade{day.tradeCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm ${day.dollarPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {day.dollarPL >= 0 ? '+' : ''}${day.dollarPL.toFixed(2)}
                      </span>
                      {isProfitDay && (
                        <span className="text-xs text-emerald-400/60">${minProfitDay}+</span>
                      )}
                      {isConsistencyViolation && (
                        <span className="text-xs text-amber-400">&gt;30%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {consistencyApplies && cycle.totalProfit > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                30% threshold: ${(cycle.totalProfit * 0.3).toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Payout history */}
        {account.payoutsCompleted > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payout History</h4>
            <p className="text-sm text-slate-300">
              {account.payoutsCompleted} payout{account.payoutsCompleted !== 1 ? 's' : ''} completed — ${account.totalPaidOut.toLocaleString()} total
            </p>
            {account.payoutsCompleted >= 6 && (
              <p className="text-xs text-emerald-400 mt-1">Caps removed — no limits on future payouts</p>
            )}
          </div>
        )}

        {/* Record Payout */}
        <div className="border-t border-slate-700 pt-4">
          {showPayoutForm ? (
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="block text-sm font-medium text-slate-300">Payout Amount</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    min={500}
                    value={payoutAmount}
                    onChange={e => setPayoutAmount(e.target.value)}
                    placeholder="500"
                    className="w-full pl-8 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <Button onClick={handleRecordPayout}>Record</Button>
              <Button variant="secondary" onClick={() => { setShowPayoutForm(false); setPayoutAmount(''); }}>Cancel</Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowPayoutForm(true)}
              disabled={!eligibility.eligible}
            >
              <DollarSign size={16} />
              Record Payout
            </Button>
          )}
          {!eligibility.eligible && !showPayoutForm && (
            <p className="text-xs text-slate-500 mt-2">
              {eligibility.reasons[0]}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function RuleCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {passed ? (
        <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
      ) : (
        <XCircle size={14} className="text-slate-500 flex-shrink-0" />
      )}
      <span className={`text-sm ${passed ? 'text-slate-200' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}
