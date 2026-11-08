import { useState } from 'react';
import { Landmark, ChevronDown, ChevronRight, Trophy } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { PracticeBank } from './usePracticeBank';
import { bankMoney } from '../../utils/practice-bank';


const inputCls = 'px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-sm font-mono text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500';

type Action = 'add' | 'allocate' | 'return';

/** Add money, or move it between the main bank and a practice folder. */
export function BankMoveForm({ bank, initial, folderId: fixedFolder, onDone }: {
  bank: PracticeBank; initial: Action; folderId?: string; onDone?: () => void;
}) {
  const folderIds = Object.keys(bank.folderNames);
  const [action, setAction] = useState<Action>(initial);
  const [amount, setAmount] = useState('');
  const [folderId, setFolderId] = useState(fixedFolder ?? folderIds[0] ?? '');
  const value = Math.round((Number(amount) || 0) * 100) / 100;
  const from = action === 'allocate' ? bank.main : action === 'return' ? bank.folders[folderId] ?? 0 : Infinity;
  const ok = value > 0 && (action === 'add' || (!!folderId && value <= from + 1e-9));

  const submit = () => {
    if (!ok) return;
    if (action === 'add') bank.addMoney(value);
    else if (action === 'allocate') bank.allocate(folderId, value);
    else bank.returnMoney(folderId, value);
    setAmount('');
    onDone?.();
  };

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="flex rounded-lg overflow-hidden border border-slate-600">
        {(['add', 'allocate', 'return'] as const).filter(a => a === 'add' || folderIds.length > 0).map(a => (
          <button
            key={a}
            type="button"
            onClick={() => setAction(a)}
            className={`px-3 py-1.5 text-xs font-medium ${action === a ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
          >
            {a === 'add' ? 'Add money' : a === 'allocate' ? 'Allocate to folder' : 'Return to bank'}
          </button>
        ))}
      </div>
      <input
        type="number" min={0} step="any" value={amount} placeholder="Amount"
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        className={`${inputCls} w-28`}
      />
      {action !== 'add' && !fixedFolder && (
        <select value={folderId} onChange={e => setFolderId(e.target.value)} className={inputCls}>
          {folderIds.map(id => <option key={id} value={id}>{bank.folderNames[id]}</option>)}
        </select>
      )}
      <Button size="sm" onClick={submit} disabled={!ok}>
        {action === 'add' ? 'Add' : action === 'allocate' ? 'Allocate' : 'Return'}
      </Button>
      {action !== 'add' && (
        <span className="text-xs text-slate-500 pb-1.5">
          {action === 'allocate' ? `Main bank has ${bankMoney(bank.main)}` : `Folder has ${bankMoney(bank.folders[folderId] ?? 0)}`}
        </span>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'text-slate-50', sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-semibold font-mono ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

/** The practice bank on the Backtesting page. */
export default function PracticeBankCard({ bank, readOnly }: { bank: PracticeBank; readOnly: boolean }) {
  const [start, setStart] = useState('1000');
  const [showStatement, setShowStatement] = useState(false);

  if (!bank.started) {
    if (readOnly) return null;
    return (
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2"><Landmark size={16} /> Practice bank</h3>
        <p className="text-sm text-slate-400">
          Treat prop firm practice like the real thing: start with some money, pay for every evaluation, renewal and activation fee from it, and bank your payouts.
          Fees from attempts you've already done come out of it too.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">Start with $</span>
          <input type="number" min={1} value={start} onChange={e => setStart(e.target.value)} className={`${inputCls} w-28`} />
          <Button size="sm" onClick={() => bank.addMoney(Number(start) || 0)} disabled={!(Number(start) > 0)}>Open bank</Button>
        </div>
      </Card>
    );
  }

  const returnPct = bank.deposited > 0 ? (bank.profit / bank.deposited) * 100 : 0;
  const series = [{ i: 0, total: 0, label: 'Start' }, ...bank.events.filter(e => !e.move).map((e, i) => ({ i: i + 1, total: Math.round(e.totalAfter), label: e.label }))];
  const folderRows = Object.entries(bank.folderNames);

  return (
    <Card className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2"><Landmark size={16} /> Practice bank</h3>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="Total" value={bankMoney(bank.total)} tone={bank.total < 0 ? 'text-rose-400' : 'text-slate-50'} sub="main bank + folders" />
        <Stat label="Main bank" value={bankMoney(bank.main)} tone={bank.main < 0 ? 'text-rose-400' : 'text-slate-50'} />
        <Stat label="Put in" value={bankMoney(bank.deposited)} sub="start + top-ups" />
        <Stat
          label="Profit / loss"
          value={bankMoney(bank.profit)}
          tone={bank.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          sub={`${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(0)}% · ${bankMoney(bank.received)} paid − ${bankMoney(bank.fees)} fees`}
        />
        <Stat label="Worst drop" value={bankMoney(bank.worstDrop)} tone="text-rose-300" sub="from a high" />
      </div>

      {folderRows.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {folderRows.map(([id, name]) => (
            <span key={id} className="px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-300">
              {name}: {id in bank.folders
                ? <span className={`font-mono ${bank.folders[id] < 0 ? 'text-rose-300' : 'text-slate-50'}`}>{bankMoney(bank.folders[id])}</span>
                : <span className="text-slate-500">pays from main bank</span>}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {bank.badges.map(b => (
          <span
            key={b.id}
            title={b.description}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${b.earned ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}
          >
            <Trophy size={12} /> {b.label}
          </span>
        ))}
      </div>

      {series.length > 2 && (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={series}>
            <XAxis dataKey="i" hide />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} width={50} tickFormatter={v => `$${v}`} />
            <ReferenceLine y={bank.deposited} stroke="#475569" strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string } | undefined)?.label ?? ''}
              formatter={v => [bankMoney(Number(v)), 'Total']}
            />
            <Line type="stepAfter" dataKey="total" stroke="#2dd4bf" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {!readOnly && <BankMoveForm bank={bank} initial="add" />}

      <div>
        <button onClick={() => setShowStatement(v => !v)} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200">
          {showStatement ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Statement ({bank.events.length})
        </button>
        {showStatement && (
          <ul className="mt-2 max-h-72 overflow-y-auto divide-y divide-slate-700/50 text-sm">
            {[...bank.events].reverse().map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex items-center gap-3 py-1.5">
                <span className="font-mono text-xs text-slate-500 w-20 shrink-0">{e.at.slice(0, 10)}</span>
                <span className="flex-1 text-slate-300 truncate">{e.label}</span>
                <span className="text-xs text-slate-500 shrink-0">{e.account === 'main' ? 'main' : bank.folderNames[e.account] ?? 'folder'}</span>
                <span className={`font-mono w-24 text-right shrink-0 ${e.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {e.amount >= 0 ? '+' : ''}{bankMoney(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
