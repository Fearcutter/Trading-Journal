export type ApexAccountSize = 25000 | 50000 | 100000 | 150000 | 200000 | 300000;
export type ApexDrawdownType = 'eod' | 'intraday';
export type ApexRuleSet = 'legacy' | 'apex3';
export type ApexAccountStatus = 'active' | 'blown' | 'completed';

export interface ApexAccount {
  id: string;
  label: string;
  accountSize: ApexAccountSize;
  drawdownType: ApexDrawdownType;
  ruleSet: ApexRuleSet;
  initialBalance: number;
  drawdownLimit: number;
  startingBalance: number; // balance when tracking started (user-entered)
  drawdownRemaining: number; // how much left to lose at time of entry
  payoutTarget: number;
  status: ApexAccountStatus;
  payoutsCompleted: number;
  totalPaidOut: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApexAccountFormData {
  label: string;
  accountSize: ApexAccountSize;
  drawdownType: ApexDrawdownType;
  ruleSet: ApexRuleSet;
  startingBalance: number | '';
  drawdownRemaining: number | '';
  payoutTarget: number | '';
  notes: string;
  payoutsCompleted: number;
  totalPaidOut: number | '';
}

export const APEX_ACCOUNT_CONFIGS: Record<ApexAccountSize, { drawdownLimit: number; initialBalance: number; safetyNet: number }> = {
  25000:  { drawdownLimit: 1500,  initialBalance: 25000,  safetyNet: 26600 },
  50000:  { drawdownLimit: 2500,  initialBalance: 50000,  safetyNet: 52600 },
  100000: { drawdownLimit: 3000,  initialBalance: 100000, safetyNet: 103100 },
  150000: { drawdownLimit: 5000,  initialBalance: 150000, safetyNet: 155100 },
  200000: { drawdownLimit: 6500,  initialBalance: 200000, safetyNet: 206600 },
  300000: { drawdownLimit: 7500,  initialBalance: 300000, safetyNet: 307600 },
};
