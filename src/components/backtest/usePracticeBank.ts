import { useCallback, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useAllPractice } from './usePractice';
import { computeBank, spendable, type BankAttempt, type BankEntry, type BankSummary } from '../../utils/practice-bank';

export interface PracticeBank extends BankSummary {
  addMoney: (amount: number) => void;
  allocate: (folderId: string, amount: number) => void;
  returnMoney: (folderId: string, amount: number) => void;
  /** What a folder can spend now, and whether it comes from the main bank. */
  spendable: (folderId: string) => { amount: number; fromMain: boolean };
  folderNames: Record<string, string>;
}

/** The practice bank: the user's money moves from settings, every fee and payout from the practice folders. */
export function usePracticeBank(): PracticeBank {
  const { practiceBank, updateSettings } = useSettings();
  const practice = useAllPractice();

  const folderNames = useMemo(() => Object.fromEntries(practice.map(p => [p.folder.id, p.folder.name])), [practice]);
  const summary = useMemo(() => {
    const attempts: BankAttempt[] = practice.flatMap(({ folder, attempts }) =>
      attempts.map(a => ({
        folderId: folder.id,
        session: a.session,
        track: a.track,
        evalPrice: folder.firmRules!.eval.fee,
        funded: a.funded ? { session: a.funded.session, track: a.funded.track } : undefined,
      })),
    );
    return computeBank(practiceBank, attempts, folderNames);
  }, [practice, practiceBank, folderNames]);

  const add = useCallback((entry: Omit<BankEntry, 'id' | 'at'>) => {
    if (!(entry.amount > 0)) return;
    const at = new Date().toISOString();
    updateSettings({ practiceBank: { entries: [...(practiceBank?.entries ?? []), { ...entry, id: crypto.randomUUID(), at }] } });
  }, [practiceBank, updateSettings]);

  return {
    ...summary,
    folderNames,
    addMoney: amount => add({ kind: 'deposit', amount }),
    allocate: (folderId, amount) => add({ kind: 'allocate', amount, folderId }),
    returnMoney: (folderId, amount) => add({ kind: 'return', amount, folderId }),
    spendable: folderId => spendable(summary, folderId),
  };
}
