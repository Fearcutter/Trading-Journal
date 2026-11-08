/// <reference lib="webworker" />
import { riskSweep, simulateFirm, type FirmConfig, type SimSummary } from '../utils/prop-ev';

export interface PropEvRequest {
  requestId: number;
  days: number[][];
  firms: FirmConfig[];
  costPerTrade: number;
  yourRisk: number;
}

export interface PropEvFirmResult {
  requestId: number;
  id: string;
  sweep: SimSummary[];
  best: SimSummary | null;
  atYourRisk: SimSummary;
}

const SWEEP_RUNS = 1000;
const DETAIL_RUNS = 5000;

self.onmessage = (e: MessageEvent<PropEvRequest>) => {
  const { requestId, days, firms, costPerTrade, yourRisk } = e.data;
  for (const cfg of firms) {
    const { points, best } = riskSweep(days, cfg, { costPerTrade, runs: SWEEP_RUNS });
    const result: PropEvFirmResult = {
      requestId,
      id: cfg.id,
      sweep: points,
      // Re-run the winner with more runs and a fresh seed so its numbers aren't the lucky draw that picked it
      best: best ? simulateFirm(days, cfg, { costPerTrade, runs: DETAIL_RUNS, riskPerTrade: best.riskPerTrade, seed: 999 }) : null,
      atYourRisk: simulateFirm(days, cfg, { costPerTrade, runs: DETAIL_RUNS, riskPerTrade: yourRisk, seed: 999 }),
    };
    self.postMessage(result);
  }
};
