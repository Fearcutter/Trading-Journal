export interface ChangelogItem {
  title: string;
  description: string;
}

export interface ChangelogEntry {
  date: string; // YYYY-MM-DD
  title: string;
  changes: ChangelogItem[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-04-10',
    title: 'April 10 Update',
    changes: [
      {
        title: '1R Column in Trade Logs',
        description: 'Session trade logs now show a 1R column (between R and 2R) indicating whether each trade reached the 1R target. Displays as points, dollars, or "+1R" depending on your P&L display setting. Toggleable via the Columns menu.',
      },
      {
        title: 'After-BE Outcome Tracking',
        description: 'Trades that return to breakeven after hitting 1R can now record what price did next — ran to the original SL or reversed toward TP. The new toggle appears in the trade form when "Returned to BE" is Yes and the result is Breakeven. Breakdowns appear in MFE/MAE analytics and in each session\'s Analytics tab.',
      },
      {
        title: 'Dashboard "Live" Filter Fixed',
        description: 'The Live button on the dashboard now correctly shows trades from your live trading sessions. Previously it only showed standalone trades with no session.',
      },
      {
        title: 'Additional Screenshots',
        description: 'Trades now support saving multiple additional screenshots alongside the setup and result images.',
      },
    ],
  },
];
