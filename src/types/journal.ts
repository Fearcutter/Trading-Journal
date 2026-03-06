export interface DailyJournalEntry {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  preMarketPlan: string;
  marketConditions: string;
  emotionalState: string;
  lessonsLearned: string;
  rating: number; // 1-5
  goals: string[];
  createdAt: string;
  updatedAt: string;
}
