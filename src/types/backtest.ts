import type { FirmConfig } from '../utils/prop-ev';

export interface BacktestSession {
  id: string;
  name: string;
  description: string;
  instrument?: string;
  color: string; // tailwind color name e.g. 'blue', 'emerald'
  createdAt: string;
  updatedAt: string;
  /** Switched off with "Shared with coach": the coach can't see this session or its trades. */
  hiddenFromCoach?: boolean;
  /** 'folder' groups other sessions; missing = a normal session. */
  kind?: 'session' | 'folder';
  /** The folder this session sits in. */
  folderId?: string;
  /** Folder only: a frozen copy of a firm's rules, which makes it a practice folder. */
  firmRules?: FirmConfig;
  /** Folder only: how many attempts the user plans to practice. */
  attemptGoal?: number;
  /** Practice attempt number inside its folder. */
  attempt?: number;
  /** Practice attempt stage: the evaluation, or the funded account after passing. */
  stage?: 'eval' | 'funded';
  /** Funded stage only: the evaluation session it came from. */
  evalSessionId?: string;
  /** Practice attempt only: copy-traded accounts (same trades on each); missing = 1. */
  copies?: number;
  /** Funded stage only: other funded accounts whose trades also count here, from `from` until `until` (ISO times). */
  copyLinks?: CopyLink[];
  /** Funded stage only: payouts taken, oldest first. */
  payouts?: PracticePayout[];
}

export interface PracticePayout {
  date: string;
  /** Taken out of the account. */
  gross: number;
  /** What the trader keeps after the split. */
  received: number;
  /** When it was recorded (ISO timestamp), for the practice bank's statement. */
  recordedAt?: string;
  /** Trading days played on the account when it was taken (used once trades are copied in). */
  dayIndex?: number;
}

export interface CopyLink {
  /** The funded session whose trades are copied. */
  sessionId: string;
  /** Trades logged there from this moment on count here (ISO timestamp). */
  from: string;
  /** Unlinked at this moment; missing = still copying. */
  until?: string;
}
