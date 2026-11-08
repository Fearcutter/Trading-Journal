import { Minus, Plus, Users } from 'lucide-react';
import { bankMoney } from '../../utils/practice-bank';

interface Props {
  copies: number;
  /** Price of one more account. */
  price: number;
  /** Money available to pay for another one; null when the bank isn't open. */
  available: number | null;
  onChange: (copies: number) => void;
}

const MAX_COPIES = 20;

/** Change how many copied accounts are in an evaluation group, before its first trade. */
export default function GroupSizeControl({ copies, price, available, onChange }: Props) {
  const canAdd = copies < MAX_COPIES && (available === null || available + 1e-9 >= price);
  const btn = 'p-1 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div className="flex items-center gap-3 flex-wrap rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm">
      <Users size={15} className="text-slate-400" />
      <span className="text-slate-300">Accounts in this group</span>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={copies <= 1} onClick={() => onChange(copies - 1)} aria-label="Remove an account">
          <Minus size={14} />
        </button>
        <span className="font-mono text-slate-50 w-5 text-center">{copies}</span>
        <button type="button" className={btn} disabled={!canAdd} onClick={() => onChange(copies + 1)} aria-label="Add an account">
          <Plus size={14} />
        </button>
      </div>
      <span className="text-xs text-slate-500">
        {bankMoney(price)} each · can change until the first trade
        {available !== null && !canAdd && copies < MAX_COPIES && ` · not enough money for another (${bankMoney(available)})`}
      </span>
    </div>
  );
}
