export type TradeDirection = 'long' | 'short';
export type TradeResult = 'win' | 'loss' | 'breakeven';
export type EmotionBefore = 'Calm/Focused' | 'Anxious' | 'Overconfident' | 'Revenge Trading' | 'FOMO' | 'Bored' | 'Frustrated';
export type EmotionAfter = 'Satisfied' | 'Regretful' | 'Relieved' | 'Frustrated' | 'Neutral';

/** Starting reasons for a potential trade; the user edits the list in Settings. */
export const DEFAULT_POTENTIAL_REASONS = ['Not at the screen', 'Chose to pass'];

// The first version saved short keys instead of the reason's text
const LEGACY_REASONS: Record<string, string> = { away: 'Not at the screen', passed: 'Chose to pass' };
export const potentialReasonLabel = (reason: string) => LEGACY_REASONS[reason] ?? reason;

export interface Trade {
  id: string;
  date: string; // ISO date string
  time: string; // HH:mm format
  exitTime?: string; // HH:mm, same timezone as time
  instrument: string; // e.g., 'NQ'
  direction: TradeDirection;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number;
  contracts: number;
  result: TradeResult;
  pointsPL: number;
  dollarPL: number;
  riskReward: number;
  setupType: string;
  confluences: string[];
  confluencesAgainst: string[];
  emotionBefore: EmotionBefore | '';
  emotionAfter: EmotionAfter | '';
  grade: string;
  preTradeNotes: string;
  postTradeNotes: string;
  setupScreenshot: string; // base64
  resultScreenshot: string; // base64
  additionalScreenshots?: string[]; // base64 array
  tags: string[];
  ifvgSize?: number;
  mae?: number;
  mfe?: number;
  drawback1R?: number;
  drawback2R?: number;
  returnedToBE?: boolean;
  afterBeOutcome?: 'hit_sl' | 'reversed_to_tp';
  overlap?: boolean;
  customFields?: Record<string, string[]>;
  accountIds?: string[];
  sessionId?: string;
  /** A trade the user would have taken but didn't (not traded on any account). Kept out of real stats. */
  potential?: boolean;
  potentialReason?: string;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export interface TradeFormData {
  date: string;
  time: string;
  exitTime?: string;
  instrument: string;
  direction: TradeDirection;
  entry: number | '';
  stopLoss: number | '';
  takeProfit: number | '';
  exitPrice: number | '';
  contracts: number;
  result: TradeResult;
  setupType: string;
  confluences: string[];
  confluencesAgainst: string[];
  emotionBefore: EmotionBefore | '';
  emotionAfter: EmotionAfter | '';
  grade: string;
  preTradeNotes: string;
  postTradeNotes: string;
  setupScreenshot: string;
  resultScreenshot: string;
  additionalScreenshots?: string[];

  tags: string[];
  ifvgSize?: number | '';
  mae?: number | '';
  mfe?: number | '';
  drawback1R?: number | '';
  drawback2R?: number | '';
  returnedToBE?: boolean;
  afterBeOutcome?: 'hit_sl' | 'reversed_to_tp';
  overlap?: boolean;
  customFields?: Record<string, string[]>;
  accountIds?: string[];
  pointsPL?: number;
  dollarPL?: number;
  riskReward?: number;
  sessionId?: string;
  potential?: boolean;
  potentialReason?: string;
}
