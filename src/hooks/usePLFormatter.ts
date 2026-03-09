import { useCallback, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../utils/formatters';
import type { Trade } from '../types/trade';

export type { PLField } from '../utils/pl-helpers';
export { getTradeRMultiple, getTradeValue } from '../utils/pl-helpers';
import type { PLField } from '../utils/pl-helpers';
import { getTradeValue } from '../utils/pl-helpers';

function formatR(n: number): string {
  const formatted = Math.abs(n).toFixed(2);
  if (n > 0) return `+${formatted}R`;
  if (n < 0) return `-${formatted}R`;
  return `${formatted}R`;
}

function formatRAbs(n: number): string {
  return `${Math.abs(n).toFixed(2)}R`;
}

export function usePLFormatter() {
  const { plDisplayMode } = useSettings();
  const isPoints = plDisplayMode === 'points';
  const isR = plDisplayMode === 'r';

  const plField: PLField = isR ? 'r' : isPoints ? 'pointsPL' : 'dollarPL';

  const getPL = useCallback((trade: Trade) => getTradeValue(trade, plField), [plField]);

  const formatPLValue = useCallback((n: number) => {
    if (isR) return formatR(n);
    if (isPoints) {
      const formatted = Math.abs(n).toFixed(2);
      if (n > 0) return `+${formatted} pts`;
      if (n < 0) return `-${formatted} pts`;
      return `${formatted} pts`;
    }
    const formatted = formatCurrency(n);
    return n > 0 ? `+${formatted}` : formatted;
  }, [isPoints, isR]);

  const formatPLAbs = useCallback((n: number) => {
    if (isR) return formatRAbs(n);
    if (isPoints) return `${Math.abs(n).toFixed(2)} pts`;
    return formatCurrency(Math.abs(n));
  }, [isPoints, isR]);

  const tickFormatter = useCallback((v: number) => {
    if (isR) return `${v.toFixed(1)}R`;
    if (isPoints) return `${v} pts`;
    return `$${v}`;
  }, [isPoints, isR]);

  const tooltipFormatter = useCallback((v: number) => {
    if (isR) return `${v.toFixed(2)}R`;
    if (isPoints) return `${v.toFixed(2)} pts`;
    return `$${v.toFixed(2)}`;
  }, [isPoints, isR]);

  const plLabel = isR ? 'P&L (R)' : isPoints ? 'P&L (pts)' : 'P&L ($)';

  return useMemo(() => ({
    plField,
    getPL,
    formatPLValue,
    formatPLAbs,
    tickFormatter,
    tooltipFormatter,
    plLabel,
    isPoints,
    isR,
  }), [plField, getPL, formatPLValue, formatPLAbs, tickFormatter, tooltipFormatter, plLabel, isPoints, isR]);
}
