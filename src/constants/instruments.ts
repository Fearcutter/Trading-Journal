import type { Instrument } from '../types/instrument';

export const DEFAULT_INSTRUMENTS: Instrument[] = [
  { symbol: 'NQ', name: 'Nasdaq 100 E-mini', tickSize: 0.25, tickValue: 5.00, pointValue: 20.00 },
  { symbol: 'MNQ', name: 'Nasdaq 100 Micro E-mini', tickSize: 0.25, tickValue: 0.50, pointValue: 2.00 },
  { symbol: 'GC', name: 'Gold Futures', tickSize: 0.10, tickValue: 10.00, pointValue: 100.00 },
];
