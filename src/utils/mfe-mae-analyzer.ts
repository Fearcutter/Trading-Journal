import type { Trade } from '../types/trade';
import { getTradeValue, type PLField } from './pl-helpers';

function getStopDistance(trade: Trade): number {
  return Math.abs(trade.entry - trade.stopLoss);
}

export function calculateMFEMAEAverages(trades: Trade[]) {
  const withData = trades.filter(t => t.mae != null && t.mfe != null);
  if (withData.length === 0) {
    return {
      totalTrades: trades.length, tradesWithData: 0,
      avgMAE: 0, maxMAE: 0, avgMFE: 0, maxMFE: 0,
      avgMAER: 0, maxMAER: 0, avgMFER: 0, maxMFER: 0,
    };
  }

  const maes = withData.map(t => t.mae!);
  const mfes = withData.map(t => t.mfe!);
  const stopDists = withData.map(t => getStopDistance(t));
  const maeRs = withData.map((_, i) => stopDists[i] > 0 ? maes[i] / stopDists[i] : 0);
  const mfeRs = withData.map((_, i) => stopDists[i] > 0 ? mfes[i] / stopDists[i] : 0);

  return {
    totalTrades: trades.length,
    tradesWithData: withData.length,
    avgMAE: maes.reduce((s, v) => s + v, 0) / maes.length,
    maxMAE: Math.max(...maes),
    avgMFE: mfes.reduce((s, v) => s + v, 0) / mfes.length,
    maxMFE: Math.max(...mfes),
    avgMAER: maeRs.reduce((s, v) => s + v, 0) / maeRs.length,
    maxMAER: Math.max(...maeRs),
    avgMFER: mfeRs.reduce((s, v) => s + v, 0) / mfeRs.length,
    maxMFER: Math.max(...mfeRs),
  };
}

export function calculateRunnerAnalysis(trades: Trade[]) {
  const withData = trades.filter(t => t.mfe != null && getStopDistance(t) > 0);
  const thresholds = [1.5, 2, 2.5, 3, 4];

  return thresholds.map(threshold => {
    const reaching = withData.filter(t => t.mfe! >= threshold * getStopDistance(t));
    return {
      threshold,
      thresholdLabel: `${threshold}R`,
      tradesReaching: reaching.length,
      percentReaching: withData.length > 0 ? (reaching.length / withData.length) * 100 : 0,
    };
  });
}

export function calculateRunnerSurvival(trades: Trade[]) {
  const withData = trades.filter(t => t.mfe != null && getStopDistance(t) > 0);

  const runnersFrom1R = withData.filter(t => t.mfe! >= getStopDistance(t));
  const exitRs = runnersFrom1R.map(t => {
    const sd = getStopDistance(t);
    const pts = t.direction === 'long' ? t.exitPrice - t.entry : t.entry - t.exitPrice;
    const exitR = sd > 0 ? pts / sd : 0;
    return { trade: t, exitR, mfeR: sd > 0 ? t.mfe! / sd : 0 };
  });

  // returnedToBE trades: runner was stopped at BE regardless of final exit price
  const survivedToClose = exitRs.filter(e => e.exitR >= 1 && !e.trade.returnedToBE).length;
  const stoppedAtBE = exitRs.filter(e => Math.abs(e.exitR) < 0.1 || e.trade.returnedToBE === true).length;
  const with1RDrawback = runnersFrom1R.filter(t => t.drawback1R != null && getStopDistance(t) > 0);
  const avgDrawbackFrom1R = with1RDrawback.length > 0
    ? with1RDrawback.reduce((s, t) => s + t.drawback1R! / getStopDistance(t), 0) / with1RDrawback.length
    : 0;

  const runnersFrom2R = withData.filter(t => t.mfe! >= 2 * getStopDistance(t));
  const with2RDrawback = runnersFrom2R.filter(t => t.drawback2R != null && getStopDistance(t) > 0);
  const avgDrawbackFrom2R = with2RDrawback.length > 0
    ? with2RDrawback.reduce((s, t) => s + t.drawback2R! / getStopDistance(t), 0) / with2RDrawback.length
    : 0;

  const extraR = runnersFrom1R.map(t => {
    const sd = getStopDistance(t);
    const mfeR = sd > 0 ? t.mfe! / sd : 0;
    return mfeR - 1; // how far beyond 1R the runner traveled
  });
  const avgExtraRPerRunner = extraR.length > 0 ? extraR.reduce((s, v) => s + v, 0) / extraR.length : 0;

  return {
    runnersFromTarget: runnersFrom1R.length,
    survivedToClose,
    stoppedAtBreakeven: stoppedAtBE,
    avgDrawbackFrom1R,
    avgDrawbackFrom2R,
    avgExtraRPerRunner,
  };
}

export function calculateGradeAnalysis(trades: Trade[], plField: PLField) {
  const groups: Record<string, Trade[]> = {};
  for (const t of trades) {
    const grade = t.grade || 'Ungraded';
    if (!groups[grade]) groups[grade] = [];
    groups[grade].push(t);
  }

  return Object.entries(groups).map(([grade, gTrades]) => {
    const wins = gTrades.filter(t => t.result === 'win');
    const withMFE = gTrades.filter(t => t.mfe != null);
    const mfes = withMFE.map(t => t.mfe!);
    const mfeRs = withMFE.map(t => {
      const sd = getStopDistance(t);
      return sd > 0 ? t.mfe! / sd : 0;
    });
    const reaching2R = withMFE.filter(t => t.mfe! >= 2 * getStopDistance(t)).length;
    const reaching3R = withMFE.filter(t => t.mfe! >= 3 * getStopDistance(t)).length;
    const avgPL = gTrades.length > 0 ? gTrades.reduce((s, t) => s + getTradeValue(t, plField), 0) / gTrades.length : 0;

    return {
      grade,
      totalTrades: gTrades.length,
      wins: wins.length,
      winRate: gTrades.length > 0 ? (wins.length / gTrades.length) * 100 : 0,
      avgMFE: mfes.length > 0 ? mfes.reduce((s, v) => s + v, 0) / mfes.length : 0,
      avgMFER: mfeRs.length > 0 ? mfeRs.reduce((s, v) => s + v, 0) / mfeRs.length : 0,
      avgPL,
      pctReaching2R: withMFE.length > 0 ? (reaching2R / withMFE.length) * 100 : 0,
      pctReaching3R: withMFE.length > 0 ? (reaching3R / withMFE.length) * 100 : 0,
    };
  }).sort((a, b) => b.avgPL - a.avgPL);
}

export function calculateAfterBEAnalysis(trades: Trade[]) {
  // Trades that hit 1R and returned to BE
  const withReturnedToBE = trades.filter(t => t.returnedToBE === true && t.mfe != null && getStopDistance(t) > 0 && t.mfe >= getStopDistance(t));

  if (withReturnedToBE.length === 0) {
    return { total: 0, wonFromBE: 0, hitSLAfterBE: 0, reversedAtBE: 0, unknownAfterBE: 0, wonPct: 0, hitSLPct: 0, reversedPct: 0 };
  }

  // result = 'win': trade reversed from BE and continued to win (no afterBeOutcome needed)
  const wonFromBE = withReturnedToBE.filter(t => t.result === 'win').length;
  // stopped at BE (result = 'breakeven'), then hit original SL
  const hitSLAfterBE = withReturnedToBE.filter(t => t.result === 'breakeven' && t.afterBeOutcome === 'hit_sl').length;
  // stopped at BE, then reversed back toward TP
  const reversedAtBE = withReturnedToBE.filter(t => t.result === 'breakeven' && t.afterBeOutcome === 'reversed_to_tp').length;
  // stopped at BE, outcome not recorded
  const unknownAfterBE = withReturnedToBE.filter(t => t.result === 'breakeven' && t.afterBeOutcome === undefined).length;

  const total = withReturnedToBE.length;
  return {
    total,
    wonFromBE,
    hitSLAfterBE,
    reversedAtBE,
    unknownAfterBE,
    wonPct: (wonFromBE / total) * 100,
    hitSLPct: (hitSLAfterBE / total) * 100,
    reversedPct: (reversedAtBE / total) * 100,
  };
}

export function calculateExitStrategyComparison(trades: Trade[]) {
  const validTrades = trades.filter(t => t.mfe != null && getStopDistance(t) > 0);
  if (validTrades.length === 0) return [];

  // Binary model matching Analytics tab:
  // Hit target = +XR, never reached 1R = -1R (stopped out), in between = 0R (BE)
  function binaryR(mfeR: number, target: number): number {
    if (mfeR >= target) return target;
    if (mfeR < 1) return -1;
    return 0;
  }

  function computeTotal(calcFn: (t: Trade) => number) {
    return validTrades.reduce((s, t) => s + calcFn(t), 0);
  }

  const strategies = [
    {
      strategy: 'All-in at 1R',
      description: 'All contracts exit at 1R target',
      calc: (t: Trade) => {
        const mfeR = t.mfe! / getStopDistance(t);
        return mfeR >= 1 ? 1 : -1;
      },
    },
    {
      strategy: '1 off at 1R, runner to 1.5R',
      description: 'Half exits at 1R, half targets 1.5R',
      calc: (t: Trade) => {
        const mfeR = t.mfe! / getStopDistance(t);
        if (mfeR < 1) return -1;
        // returnedToBE: runner was stopped at BE (0R for runner portion)
        const runnerMfeR = t.returnedToBE ? Math.min(mfeR, 1) : mfeR;
        return (1 + binaryR(runnerMfeR, 1.5)) / 2;
      },
    },
    {
      strategy: '1 off at 1R, runner to 2R',
      description: 'Half exits at 1R, half targets 2R',
      calc: (t: Trade) => {
        const mfeR = t.mfe! / getStopDistance(t);
        if (mfeR < 1) return -1;
        const runnerMfeR = t.returnedToBE ? Math.min(mfeR, 1) : mfeR;
        return (1 + binaryR(runnerMfeR, 2)) / 2;
      },
    },
    {
      strategy: '1 off at 1R, runner to 2.5R',
      description: 'Half exits at 1R, half targets 2.5R',
      calc: (t: Trade) => {
        const mfeR = t.mfe! / getStopDistance(t);
        if (mfeR < 1) return -1;
        const runnerMfeR = t.returnedToBE ? Math.min(mfeR, 1) : mfeR;
        return (1 + binaryR(runnerMfeR, 2.5)) / 2;
      },
    },
    {
      strategy: '1 off at 1R, runner to 3R',
      description: 'Half exits at 1R, half targets 3R',
      calc: (t: Trade) => {
        const mfeR = t.mfe! / getStopDistance(t);
        if (mfeR < 1) return -1;
        const runnerMfeR = t.returnedToBE ? Math.min(mfeR, 1) : mfeR;
        return (1 + binaryR(runnerMfeR, 3)) / 2;
      },
    },
    {
      strategy: 'All-in at 2R',
      description: 'All contracts exit at 2R target',
      calc: (t: Trade) => {
        const mfeR = t.returnedToBE ? Math.min(t.mfe! / getStopDistance(t), 1) : t.mfe! / getStopDistance(t);
        return binaryR(mfeR, 2);
      },
    },
    {
      strategy: 'All-in at 2.5R',
      description: 'All contracts exit at 2.5R target',
      calc: (t: Trade) => {
        const mfeR = t.returnedToBE ? Math.min(t.mfe! / getStopDistance(t), 1) : t.mfe! / getStopDistance(t);
        return binaryR(mfeR, 2.5);
      },
    },
    {
      strategy: 'All-in at 3R',
      description: 'All contracts exit at 3R target',
      calc: (t: Trade) => {
        const mfeR = t.returnedToBE ? Math.min(t.mfe! / getStopDistance(t), 1) : t.mfe! / getStopDistance(t);
        return binaryR(mfeR, 3);
      },
    },
  ];

  const baselineTotal = computeTotal(strategies[0].calc);

  return strategies.map(s => {
    const totalR = computeTotal(s.calc);
    return {
      strategy: s.strategy,
      description: s.description,
      expectedDollar: totalR,
      avgR: validTrades.length > 0 ? totalR / validTrades.length : 0,
      diffFromBaseline: totalR - baselineTotal,
      tradesUsed: validTrades.length,
    };
  });
}
