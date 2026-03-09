import { createContext, useContext, type ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ApexAccount, ApexAccountFormData } from '../types/apex-account';
import { APEX_ACCOUNT_CONFIGS } from '../types/apex-account';
import { useIndexedDB } from '../hooks/useIndexedDB';

interface ApexAccountContextValue {
  accounts: ApexAccount[];
  loading: boolean;
  addAccount: (data: ApexAccountFormData) => ApexAccount;
  updateAccount: (id: string, updates: Partial<ApexAccount>) => void;
  deleteAccount: (id: string) => void;
  recordPayout: (id: string, amount: number) => void;
}

const ApexAccountContext = createContext<ApexAccountContextValue | null>(null);

export function ApexAccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts, loading] = useIndexedDB<ApexAccount[]>('apex-accounts', 'apex-accounts-data', []);

  const addAccount = useCallback((data: ApexAccountFormData): ApexAccount => {
    const now = new Date().toISOString();
    const config = APEX_ACCOUNT_CONFIGS[data.accountSize];
    const account: ApexAccount = {
      id: uuidv4(),
      label: data.label,
      accountSize: data.accountSize,
      drawdownType: data.drawdownType,
      ruleSet: data.ruleSet,
      initialBalance: config.initialBalance,
      drawdownLimit: config.drawdownLimit,
      startingBalance: Number(data.startingBalance) || config.initialBalance,
      drawdownRemaining: Number(data.drawdownRemaining) || config.drawdownLimit,
      payoutTarget: Number(data.payoutTarget) || 500,
      status: 'active',
      payoutsCompleted: data.payoutsCompleted || 0,
      totalPaidOut: Number(data.totalPaidOut) || 0,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };
    setAccounts(prev => [account, ...prev]);
    return account;
  }, [setAccounts]);

  const updateAccount = useCallback((id: string, updates: Partial<ApexAccount>) => {
    setAccounts(prev =>
      prev.map(a =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      )
    );
  }, [setAccounts]);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, [setAccounts]);

  const recordPayout = useCallback((id: string, amount: number) => {
    setAccounts(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        return {
          ...a,
          payoutsCompleted: a.payoutsCompleted + 1,
          totalPaidOut: a.totalPaidOut + amount,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, [setAccounts]);

  return (
    <ApexAccountContext.Provider value={{ accounts, loading, addAccount, updateAccount, deleteAccount, recordPayout }}>
      {children}
    </ApexAccountContext.Provider>
  );
}

export function useApexAccounts() {
  const context = useContext(ApexAccountContext);
  if (!context) throw new Error('useApexAccounts must be used within ApexAccountProvider');
  return context;
}
