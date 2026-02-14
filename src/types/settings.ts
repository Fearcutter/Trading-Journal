import type { Instrument } from './instrument';

export interface Settings {
  confluences: string[];
  setupTypes: string[];
  instruments: Instrument[];
  defaultContracts: number;
  defaultInstrument: string;
}
