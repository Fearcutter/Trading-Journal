import { useState } from 'react';
import { useApexAccounts } from '../context/ApexAccountContext';
import { useTrades } from '../context/TradeContext';
import { useApexPayoutStatus } from '../hooks/useApexPayoutStatus';
import type { ApexAccountFormData, ApexAccountSize, ApexAccountStatus } from '../types/apex-account';
import { APEX_ACCOUNT_CONFIGS } from '../types/apex-account';
import ApexAccountDetail from '../components/dashboard/ApexAccountDetail';
import ApexPasswordGate, { ApexLockControls } from '../components/apex/ApexPasswordGate';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, X, Edit2, AlertTriangle, CheckCircle, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';

const ACCOUNT_SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: '25000', label: '$25K' },
  { value: '50000', label: '$50K' },
  { value: '100000', label: '$100K' },
  { value: '150000', label: '$150K' },
  { value: '200000', label: '$200K' },
  { value: '300000', label: '$300K' },
];

const STATUS_LABELS: Record<ApexAccountStatus, { text: string; color: string }> = {
  active: { text: 'Active', color: 'bg-emerald-400/10 text-emerald-400' },
  blown: { text: 'Blown', color: 'bg-rose-400/10 text-rose-400' },
  completed: { text: 'Completed', color: 'bg-blue-400/10 text-blue-400' },
};

export default function ApexAccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useApexAccounts();
  const { trades } = useTrades();
  const statuses = useApexPayoutStatus(accounts, trades);
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [requestLock, setRequestLock] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ApexAccountFormData>({
    label: '',
    accountSize: 25000,
    drawdownType: 'eod',
    ruleSet: 'legacy',
    startingBalance: '',
    drawdownRemaining: '',
    payoutTarget: '',
    notes: '',
    payoutsCompleted: 0,
    totalPaidOut: '',
  });

  const resetForm = () => {
    setForm({
      label: '', accountSize: 25000, drawdownType: 'eod', ruleSet: 'legacy',
      startingBalance: '', drawdownRemaining: '', payoutTarget: '', notes: '',
      payoutsCompleted: 0, totalPaidOut: '',
    });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!form.label.trim()) { toast.error('Label is required'); return; }

    if (editId) {
      const config = APEX_ACCOUNT_CONFIGS[form.accountSize];
      updateAccount(editId, {
        label: form.label,
        accountSize: form.accountSize,
        drawdownType: form.drawdownType,
        ruleSet: form.ruleSet,
        initialBalance: config.initialBalance,
        drawdownLimit: config.drawdownLimit,
        startingBalance: Number(form.startingBalance) || config.initialBalance,
        drawdownRemaining: Number(form.drawdownRemaining) || config.drawdownLimit,
        payoutTarget: Number(form.payoutTarget) || 500,
        notes: form.notes,
        payoutsCompleted: form.payoutsCompleted,
        totalPaidOut: Number(form.totalPaidOut) || 0,
      });
      toast.success(`Updated ${form.label}`);
    } else {
      addAccount(form);
      toast.success(`Added ${form.label}`);
    }
    resetForm();
  };

  const startEdit = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    setForm({
      label: acc.label,
      accountSize: acc.accountSize,
      drawdownType: acc.drawdownType,
      ruleSet: acc.ruleSet,
      startingBalance: acc.startingBalance,
      drawdownRemaining: acc.drawdownRemaining,
      payoutTarget: acc.payoutTarget,
      notes: acc.notes,
      payoutsCompleted: acc.payoutsCompleted,
      totalPaidOut: acc.totalPaidOut,
    });
    setEditId(id);
    setShowForm(true);
  };

  const formatSize = (size: number) => size >= 1000 ? `${size / 1000}K` : `${size}`;

  const selectedStatus = statuses.find(s => s.account.id === detailAccountId);

  const activeStatuses = statuses
    .filter(s => s.account.status === 'active')
    .sort((a, b) => a.account.label.localeCompare(b.account.label));
  const inactiveAccounts = accounts
    .filter(a => a.status !== 'active')
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <ApexPasswordGate
      onLockStateChange={(val) => { setUnlocked(val); if (val) setRequestLock(false); }}
      showChangePassword={showChangePassword}
      onChangePasswordDone={() => setShowChangePassword(false)}
      requestLock={requestLock}
    >
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Landmark size={24} className="text-blue-400" />
          <h1 className="text-xl font-bold text-slate-50">Funded Accounts</h1>
        </div>
        <div className="flex items-center gap-2">
          {unlocked && (
            <ApexLockControls
              onLock={() => setRequestLock(true)}
              onChangePassword={() => setShowChangePassword(true)}
            />
          )}
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Add Account
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">{editId ? 'Edit Account' : 'Add Account'}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">Label</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. #1"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">Account Size</label>
                <select
                  value={form.accountSize}
                  onChange={e => setForm(f => ({ ...f, accountSize: Number(e.target.value) as ApexAccountSize }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACCOUNT_SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">Drawdown Type</label>
                <select
                  value={form.drawdownType}
                  onChange={e => setForm(f => ({ ...f, drawdownType: e.target.value as 'eod' | 'intraday' }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="eod">EOD Trailing</option>
                  <option value="intraday">Intraday Trailing</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">Rule Set</label>
                <select
                  value={form.ruleSet}
                  onChange={e => setForm(f => ({ ...f, ruleSet: e.target.value as 'legacy' | 'apex3' }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="legacy">Legacy</option>
                  <option value="apex3">Apex 3.0</option>
                </select>
              </div>
              <Input
                label="Current Balance ($)"
                type="number"
                step="0.01"
                value={form.startingBalance}
                onChange={e => setForm(f => ({ ...f, startingBalance: e.target.value === '' ? '' : Number(e.target.value) }))}
                placeholder={String(APEX_ACCOUNT_CONFIGS[form.accountSize].initialBalance)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Drawdown Remaining ($)"
                type="number"
                step="0.01"
                value={form.drawdownRemaining}
                onChange={e => setForm(f => ({ ...f, drawdownRemaining: e.target.value === '' ? '' : Number(e.target.value) }))}
                placeholder={String(APEX_ACCOUNT_CONFIGS[form.accountSize].drawdownLimit)}
              />
              <Input
                label="Profit Target ($)"
                type="number"
                min={500}
                value={form.payoutTarget}
                onChange={e => setForm(f => ({ ...f, payoutTarget: e.target.value === '' ? '' : Number(e.target.value) }))}
                placeholder="500"
              />
            </div>
            {editId && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Payouts Completed"
                  type="number"
                  min={0}
                  max={6}
                  value={form.payoutsCompleted}
                  onChange={e => setForm(f => ({ ...f, payoutsCompleted: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  label="Total Paid Out ($)"
                  type="number"
                  min={0}
                  value={form.totalPaidOut}
                  onChange={e => setForm(f => ({ ...f, totalPaidOut: e.target.value === '' ? '' : Number(e.target.value) }))}
                />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSubmit}>{editId ? 'Update' : 'Add'}</Button>
              <Button size="sm" variant="secondary" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Active Accounts — Payout Status Cards */}
      {activeStatuses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeStatuses.map(({ account, cycle, eligibility }) => (
            <Card key={account.id} className="relative group">
              <button
                onClick={() => setDetailAccountId(account.id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">
                      {formatSize(account.accountSize)} {account.label}
                    </span>
                    {eligibility.eligible && (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <CheckCircle size={12} /> Ready
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{eligibility.progress}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      eligibility.eligible ? 'bg-emerald-400' : eligibility.progress >= 60 ? 'bg-amber-400' : 'bg-blue-400'
                    }`}
                    style={{ width: `${eligibility.progress}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mb-2">
                  <div>
                    <p className="text-xs text-slate-500">Balance</p>
                    <p className={`text-sm font-medium font-mono ${cycle.currentBalance >= account.initialBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${cycle.currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Trading Days</p>
                    <p className="text-sm font-medium text-slate-200">{cycle.tradingDaysCount}/8</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Profit Days</p>
                    <p className="text-sm font-medium text-slate-200">{cycle.profitDaysCount}/5</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Cushion</p>
                    <p className={`text-sm font-medium ${cycle.cushion < 500 ? 'text-rose-400' : cycle.cushion < 1000 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ${cycle.cushion.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* Warnings */}
                {cycle.consistencyViolations.length > 0 && (
                  <div className="mt-1">
                    {cycle.consistencyViolations.map(v => (
                      <p key={v.date} className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={11} />
                        {v.date} is {v.percentage.toFixed(0)}% of total (max 30%)
                      </p>
                    ))}
                  </div>
                )}

              </button>

              {/* Edit/status controls */}
              <div className="absolute bottom-3 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={(e) => { e.stopPropagation(); startEdit(account.id); }} className="p-1 text-slate-500 hover:text-blue-400">
                  <Edit2 size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); updateAccount(account.id, { status: 'blown' }); }} className="p-1 text-slate-500 hover:text-amber-400" title="Mark blown">
                  <AlertTriangle size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteAccount(account.id); toast.success(`Deleted ${account.label}`); }}
                  className="p-1 text-slate-500 hover:text-rose-400"
                >
                  <X size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {accounts.length === 0 && !showForm && (
        <Card>
          <div className="py-12 text-center">
            <Landmark size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-400 mb-4">No accounts added yet</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add Your First Account
            </Button>
          </div>
        </Card>
      )}

      {/* Inactive accounts */}
      {inactiveAccounts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Inactive</h3>
          <div className="space-y-2">
            {inactiveAccounts.map(acc => {
              const statusInfo = STATUS_LABELS[acc.status];
              return (
                <div key={acc.id} className="flex items-center justify-between py-2 px-3 bg-slate-800 border border-slate-700 rounded-lg group">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">{formatSize(acc.accountSize)} {acc.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.text}</span>
                    <span className="text-xs text-slate-500">{acc.payoutsCompleted}/6 payouts</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {acc.status === 'blown' && (
                      <button onClick={() => updateAccount(acc.id, { status: 'active' })} className="px-2 py-0.5 text-xs text-slate-500 hover:text-emerald-400">
                        Reactivate
                      </button>
                    )}
                    <button onClick={() => startEdit(acc.id)} className="p-1 text-slate-500 hover:text-blue-400">
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => { deleteAccount(acc.id); toast.success(`Deleted ${acc.label}`); }}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedStatus && (
        <ApexAccountDetail
          open={!!detailAccountId}
          onOpenChange={(open) => { if (!open) setDetailAccountId(null); }}
          status={selectedStatus}
        />
      )}
    </div>
    </ApexPasswordGate>
  );
}
