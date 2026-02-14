import type { Instrument } from '../types/instrument';

export const DEFAULT_INSTRUMENTS: Instrument[] = [
  { symbol: 'NQ', name: 'Nasdaq 100 E-mini', tickSize: 0.25, tickValue: 5.00, pointValue: 20.00 },
  { symbol: 'ES', name: 'S&P 500 E-mini', tickSize: 0.25, tickValue: 12.50, pointValue: 50.00 },
  { symbol: 'YM', name: 'Dow E-mini', tickSize: 1.00, tickValue: 5.00, pointValue: 5.00 },
  { symbol: 'RTY', name: 'Russell 2000 E-mini', tickSize: 0.10, tickValue: 5.00, pointValue: 50.00 },
  { symbol: 'CL', name: 'Crude Oil', tickSize: 0.01, tickValue: 10.00, pointValue: 1000.00 },
  { symbol: 'GC', name: 'Gold', tickSize: 0.10, tickValue: 10.00, pointValue: 100.00 },
];
