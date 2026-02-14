export type TradeDirection = 'long' | 'short';
export type TradeResult = 'win' | 'loss' | 'breakeven';
export type EmotionBefore = 'Calm/Focused' | 'Anxious' | 'Overconfident' | 'Revenge Trading' | 'FOMO' | 'Bored' | 'Frustrated';
export type EmotionAfter = 'Satisfied' | 'Regretful' | 'Relieved' | 'Frustrated' | 'Neutral';

export interface Trade {
  id: string;
  date: string; // ISO date string
  time: string; // HH:mm format
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
  emotionBefore: EmotionBefore | '';
  emotionAfter: EmotionAfter | '';
  rating: number; // 1-5
  preTradeNotes: string;
  postTradeNotes: string;
  setupScreenshot: string; // base64
  resultScreenshot: string; // base64
  tags: string[];
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export interface TradeFormData {
  date: string;
  time: string;
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
  emotionBefore: EmotionBefore | '';
  emotionAfter: EmotionAfter | '';
  rating: number;
  preTradeNotes: string;
  postTradeNotes: string;
  setupScreenshot: string;
  resultScreenshot: string;
  tags: string[];
}
