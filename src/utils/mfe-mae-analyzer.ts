import type { Trade } from '../types/trade';

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
    const wins = reaching.filter(t => t.result === 'win');
    return {
      threshold,
      thresholdLabel: `${threshold}R`,
      tradesReaching: reaching.length,
      percentReaching: withData.length > 0 ? (reaching.length / withData.length) * 100 : 0,
      wins: wins.length,
      winRate: reaching.length > 0 ? (wins.length / reaching.length) * 100 : 0,
    };
  });
}

export function calculateRunnerSurvival(trades: Trade[]) {
  const withData = trades.filter(t => t.mfe != null && getStopDistance(t) > 0);

  const runnersFrom1R = withData.filter(t => t.mfe! >= getStopDistance(t));
  const exitRs = runnersFrom1R.map(t => {
    const sd = getStopDistance(t);
    const exitR = sd > 0 ? Math.abs(t.exitPrice - t.entry) / sd * (t.dollarPL >= 0 ? 1 : -1) : 0;
    return { trade: t, exitR, mfeR: sd > 0 ? t.mfe! / sd : 0 };
  });

  const survivedToClose = exitRs.filter(e => e.exitR >= 1).length;
  const stoppedAtBE = exitRs.filter(e => Math.abs(e.exitR) < 0.1).length;
  const drawbackFrom1R = exitRs.map(e => e.mfeR - e.exitR);
  const avgDrawbackFrom1R = drawbackFrom1R.length > 0 ? drawbackFrom1R.reduce((s, v) => s + v, 0) / drawbackFrom1R.length : 0;

  const runnersFrom2R = withData.filter(t => t.mfe! >= 2 * getStopDistance(t));
  const exitRs2R = runnersFrom2R.map(t => {
    const sd = getStopDistance(t);
    const exitR = sd > 0 ? Math.abs(t.exitPrice - t.entry) / sd * (t.dollarPL >= 0 ? 1 : -1) : 0;
    const mfeR = sd > 0 ? t.mfe! / sd : 0;
    return mfeR - exitR;
  });
  const avgDrawbackFrom2R = exitRs2R.length > 0 ? exitRs2R.reduce((s, v) => s + v, 0) / exitRs2R.length : 0;

  const extraDollars = runnersFrom1R.map(t => {
    const sd = getStopDistance(t);
    const baselineProfit = sd; // 1R profit in points
    const actualProfit = t.dollarPL > 0 ? Math.abs(t.exitPrice - t.entry) : 0;
    return actualProfit - baselineProfit;
  });
  const avgExtraDollarPerRunner = extraDollars.length > 0 ? extraDollars.reduce((s, v) => s + v, 0) / extraDollars.length : 0;

  return {
    runnersFromTarget: runnersFrom1R.length,
    survivedToClose,
    stoppedAtBreakeven: stoppedAtBE,
    avgDrawbackFrom1R,
    avgDrawbackFrom2R,
    avgExtraDollarPerRunner,
  };
}

export function calculateGradeAnalysis(trades: Trade[]) {
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

    return {
      grade,
      totalTrades: gTrades.length,
      wins: wins.length,
      winRate: gTrades.length > 0 ? (wins.length / gTrades.length) * 100 : 0,
      avgMFE: mfes.length > 0 ? mfes.reduce((s, v) => s + v, 0) / mfes.length : 0,
      avgMFER: mfeRs.length > 0 ? mfeRs.reduce((s, v) => s + v, 0) / mfeRs.length : 0,
      avgDollarPL: gTrades.length > 0 ? gTrades.reduce((s, t) => s + t.dollarPL, 0) / gTrades.length : 0,
      pctReaching2R: withMFE.length > 0 ? (reaching2R / withMFE.length) * 100 : 0,
      pctReaching3R: withMFE.length > 0 ? (reaching3R / withMFE.length) * 100 : 0,
    };
  }).sort((a, b) => b.avgDollarPL - a.avgDollarPL);
}

export function calculateExitStrategyComparison(trades: Trade[]) {
  const withData = trades.filter(t => t.mfe != null && getStopDistance(t) > 0);
  if (withData.length === 0) return [];

  function computeExpected(calcFn: (t: Trade) => number) {
    const results = withData.map(calcFn);
    return results.reduce((s, v) => s + v, 0) / results.length;
  }

  const strategies = [
    {
      strategy: 'All-in at 1R',
      description: 'All contracts exit at 1R target',
      calc: (t: Trade) => {
        const sd = getStopDistance(t);
        const mfeR = t.mfe! / sd;
        return mfeR >= 1 ? sd : -sd; // hit target or stopped out
      },
    },
    {
      strategy: '1 off at 1R, runner to 1.5R',
      description: 'Half exits at 1R, half at min(MFE, 1.5R)',
      calc: (t: Trade) => {
        const sd = getStopDistance(t);
        const mfeR = t.mfe! / sd;
        if (mfeR < 1) return -sd;
        const half1 = sd; // 1R
        const half2 = Math.min(t.mfe!, 1.5 * sd);
        return (half1 + half2) / 2;
      },
    },
    {
      strategy: '1 off at 1R, runner to 2R',
      description: 'Half exits at 1R, half at min(MFE, 2R)',
      calc: (t: Trade) => {
        const sd = getStopDistance(t);
        const mfeR = t.mfe! / sd;
        if (mfeR < 1) return -sd;
        const half1 = sd;
        const half2 = Math.min(t.mfe!, 2 * sd);
        return (half1 + half2) / 2;
      },
    },
    {
      strategy: '1 off at 1R, runner to 2.5R',
      description: 'Half exits at 1R, half at min(MFE, 2.5R)',
      calc: (t: Trade) => {
        const sd = getStopDistance(t);
        const mfeR = t.mfe! / sd;
        if (mfeR < 1) return -sd;
        const half1 = sd;
        const half2 = Math.min(t.mfe!, 2.5 * sd);
        return (half1 + half2) / 2;
      },
    },
    {
      strategy: '1 off at 1R, runner to 3R',
      description: 'Half exits at 1R, half at min(MFE, 3R)',
      calc: (t: Trade) => {
        const sd = getStopDistance(t);
        const mfeR = t.mfe! / sd;
        if (mfeR < 1) return -sd;
        const half1 = sd;
        const half2 = Math.min(t.mfe!, 3 * sd);
        return (half1 + half2) / 2;
      },
    },
    {
      strategy: 'All-in at 2R',
      description: 'All contracts exit at 2R target',
      calc: (t: Trade) => {
        const sd = getStopDistance(t);
        const mfeR = t.mfe! / sd;
        return mfeR >= 2 ? 2 * sd : -sd;
      },
    },
    {
      strategy: 'All-in at 2.5R',
      description: 'All contracts exit at 2.5R target',
      calc: (t: Trade) => {
        const sd = getStopDistance(t);
        const mfeR = t.mfe! / sd;
        return mfeR >= 2.5 ? 2.5 * sd : -sd;
      },
    },
    {
      strategy: 'All-in at 3R',
      description: 'All contracts exit at 3R target',
      calc: (t: Trade) => {
        const sd = getStopDistance(t);
        const mfeR = t.mfe! / sd;
        return mfeR >= 3 ? 3 * sd : -sd;
      },
    },
  ];

  const baseline = computeExpected(strategies[0].calc);

  return strategies.map(s => ({
    strategy: s.strategy,
    description: s.description,
    expectedDollar: computeExpected(s.calc),
    diffFromBaseline: computeExpected(s.calc) - baseline,
    tradesUsed: withData.length,
  }));
}
