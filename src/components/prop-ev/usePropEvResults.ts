import { useEffect, useRef, useState } from 'react';
import type { FirmConfig } from '../../utils/prop-ev';
import type { PropEvFirmResult, PropEvRequest } from '../../workers/prop-ev.worker';

/**
 * Runs the firm simulations in a background worker. Results arrive one firm at a time;
 * a new request (changed trades, risk or rules) cancels the one still running.
 */
export function usePropEvResults(days: number[][], firms: FirmConfig[], costPerTrade: number, yourRisk: number) {
  const [results, setResults] = useState<Record<string, PropEvFirmResult>>({});
  const [pending, setPending] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      workerRef.current?.terminate();
      const worker = new Worker(new URL('../../workers/prop-ev.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      const requestId = ++requestRef.current;
      let left = firms.length;
      setPending(left);
      worker.onmessage = (e: MessageEvent<PropEvFirmResult>) => {
        if (e.data.requestId !== requestId) return;
        setResults(prev => ({ ...prev, [e.data.id]: e.data }));
        left--;
        setPending(left);
        if (left === 0) worker.terminate();
      };
      const req: PropEvRequest = { requestId, days, firms, costPerTrade, yourRisk };
      worker.postMessage(req);
    }, 400);
    return () => clearTimeout(timer);
  }, [days, firms, costPerTrade, yourRisk]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  return { results, running: pending > 0 };
}
