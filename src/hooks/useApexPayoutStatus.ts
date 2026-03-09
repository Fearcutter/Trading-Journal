import { useMemo } from 'react';
import type { ApexAccount } from '../types/apex-account';
import type { Trade } from '../types/trade';
import { computeCurrentCycle, checkEligibility, type PayoutCycle, type EligibilityResult } from '../utils/apex-payout';

export interface ApexPayoutStatus {
  account: ApexAccount;
  cycle: PayoutCycle;
  eligibility: EligibilityResult;
}

export function useApexPayoutStatus(accounts: ApexAccount[], trades: Trade[]): ApexPayoutStatus[] {
  return useMemo(() => {
    return accounts
      .filter(a => a.status === 'active')
      .map(account => {
        const cycle = computeCurrentCycle(account, trades);
        const eligibility = checkEligibility(cycle, account);
        return { account, cycle, eligibility };
      });
  }, [accounts, trades]);
}
