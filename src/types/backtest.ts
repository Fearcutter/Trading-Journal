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
}
