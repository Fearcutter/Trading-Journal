import { useEffect, useRef, useState } from 'react';
import type { SimInputs } from '../../utils/ror-sim/types';
import type { StrategyResult } from '../../utils/ror-sim/summary';
import type { ExactEval } from '../../utils/ror-sim/exact';
import type { EvalSizeRow, RorMessage, RorRequest } from '../../workers/ror-sim.worker';

export interface RorResults {
  strategies: Record<string, StrategyResult>;
  exact: ExactEval | null;
  evalSizes: EvalSizeRow[];
  bestId: string | null;
}

const EMPTY: RorResults = { strategies: {}, exact: null, evalSizes: [], bestId: null };

/** Runs the simulator in a background worker when asked; a new run cancels the one still going. */
export function useRorResults() {
  const [results, setResults] = useState<RorResults>(EMPTY);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [ranWith, setRanWith] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);

  const run = (inputs: SimInputs) => {
    workerRef.current?.terminate();
    const worker = new Worker(new URL('../../workers/ror-sim.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    const requestId = ++requestRef.current;
    setResults(EMPTY);
    setProgress({ done: 0, total: 1 });
    setRanWith(JSON.stringify(inputs));
    worker.onmessage = (e: MessageEvent<RorMessage>) => {
      const m = e.data;
      if (m.requestId !== requestId) return;
      if (m.kind === 'strategy') {
        setResults(prev => ({ ...prev, strategies: { ...prev.strategies, [m.result.id]: m.result } }));
        setProgress({ done: m.done, total: m.total });
      } else {
        setResults(prev => ({ ...prev, exact: m.exact, evalSizes: m.evalSizes, bestId: m.bestId }));
        setProgress(null);
        worker.terminate();
      }
    };
    worker.postMessage({ requestId, inputs } satisfies RorRequest);
  };

  useEffect(() => () => workerRef.current?.terminate(), []);

  return { results, progress, run, ranWith };
}
