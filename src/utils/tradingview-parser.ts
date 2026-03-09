import type { Instrument } from '../types/instrument';
import { calculatePointsPL, computeResult } from './pnl-calculator';
import { unixToTimezone } from './timezone';

export interface ParsedTradeData {
  direction: 'long' | 'short';
  entry: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  pointsPL: number;
  result: 'win' | 'loss' | 'breakeven';
  date?: string;  // yyyy-MM-dd
  time?: string;  // HH:mm
}

/**
 * Parse TradingView Position Tool HTML clipboard content.
 * TradingView copies a <span> with a `data-tradingview-clip` attribute
 * containing a JSON blob with all trade data.
 */
export function parseTradingViewHTML(html: string, instruments?: Instrument[], timezone?: string): ParsedTradeData | null {
  if (!html || html.trim().length === 0) return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find element with data-tradingview-clip attribute
    const el = doc.querySelector('[data-tradingview-clip]');
    if (!el) return null;

    const jsonStr = el.getAttribute('data-tradingview-clip');
    if (!jsonStr) return null;

    const clip = JSON.parse(jsonStr);

    // Determine direction from title or source type
    let direction: 'long' | 'short' | null = null;
    const title = (clip.title || '').toLowerCase();
    if (title.includes('long')) {
      direction = 'long';
    } else if (title.includes('short')) {
      direction = 'short';
    }

    // Fallback: check source type (e.g. "LineToolRiskRewardLong")
    if (!direction) {
      const sourceType = (clip.sources?.[0]?.source?.type || '').toLowerCase();
      if (sourceType.includes('long')) {
        direction = 'long';
      } else if (sourceType.includes('short')) {
        direction = 'short';
      }
    }

    if (!direction) return null;

    // Extract entry price
    const entry = clip.sources?.[0]?.source?.points?.[0]?.price;
    if (typeof entry !== 'number' || entry <= 0) return null;

    // Compute R:R from profitLevel / stopLevel (tick-based offsets)
    const state = clip.sources?.[0]?.source?.state;
    const stopLevel = state?.stopLevel;
    const profitLevel = state?.profitLevel;
    const riskReward = (stopLevel && profitLevel && stopLevel > 0)
      ? Math.round((profitLevel / stopLevel) * 100) / 100
      : 0;

    // Extract exit price from points[3] (the close line position)
    const points = clip.sources?.[0]?.source?.points;
    const exitPrice = points?.[3]?.price;
    if (typeof exitPrice !== 'number' || exitPrice <= 0) return null;

    // Extract trade date/time from entry point timestamp
    let date: string | undefined;
    let time: string | undefined;
    const timeT = points?.[0]?.time_t;
    if (typeof timeT === 'number' && timeT > 0) {
      const tz = timezone || 'America/New_York';
      const converted = unixToTimezone(timeT, tz);
      date = converted.date;
      time = converted.time;
    }

    // Derive SL/TP from tick offsets using instrument tickSize
    let stopLoss = 0;
    let takeProfit = 0;

    if (instruments && stopLevel && profitLevel) {
      const symbolRaw = state?.symbol || '';
      const afterColon = symbolRaw.includes(':') ? symbolRaw.split(':')[1] : symbolRaw;
      const baseSymbol = afterColon.replace(/[FGHJKMNQUVXZ]?\d+!?$/, '');

      const instrument = instruments.find(i => i.symbol === baseSymbol);
      if (instrument) {
        const { tickSize } = instrument;
        if (direction === 'long') {
          stopLoss = entry - stopLevel * tickSize;
          takeProfit = entry + profitLevel * tickSize;
        } else {
          stopLoss = entry + stopLevel * tickSize;
          takeProfit = entry - profitLevel * tickSize;
        }
      }
    }

    const pointsPL = calculatePointsPL(entry, exitPrice, direction);
    const result = computeResult(entry, exitPrice, direction, stopLoss || undefined, takeProfit || undefined);

    return {
      direction,
      entry: Math.round(entry * 100) / 100,
      exitPrice: Math.round(exitPrice * 100) / 100,
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
      riskReward,
      pointsPL,
      result,
      date,
      time,
    };
  } catch {
    return null;
  }
}

/**
 * Parse TradingView Position Tool clipboard text.
 * TV Position Tool typically outputs something like:
 *   "Long 21234.50
 *    Profit 25.00 (0.12%)
 *    Stop 21209.50 Risk 25.00
 *    Target 21284.50 Reward 50.00
 *    Risk/Reward 1:2.00"
 *
 * This parser is flexible and handles common TV clipboard variations.
 */
export function parseTradingViewClipboard(text: string): ParsedTradeData | null {
  if (!text || text.trim().length === 0) return null;

  const lines = text.trim().split('\n').map(l => l.trim());
  if (lines.length < 2) return null;

  try {
    // Detect direction
    const directionLine = lines[0].toLowerCase();
    let direction: 'long' | 'short';
    if (directionLine.includes('long')) {
      direction = 'long';
    } else if (directionLine.includes('short')) {
      direction = 'short';
    } else {
      return null;
    }

    // Extract entry price from first line
    const entryMatch = lines[0].match(/([\d,]+\.?\d*)/);
    if (!entryMatch) return null;
    const entry = parseFloat(entryMatch[1].replace(/,/g, ''));

    // Extract stop loss
    let stopLoss = 0;
    let takeProfit = 0;
    let riskReward = 0;
    let profitPoints: number | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Stop loss / risk line
      const stopMatch = line.match(/stop\s*([\d,]+\.?\d*)/i);
      if (stopMatch) {
        stopLoss = parseFloat(stopMatch[1].replace(/,/g, ''));
      }

      // Target / reward line
      const targetMatch = line.match(/target\s*([\d,]+\.?\d*)/i);
      if (targetMatch) {
        takeProfit = parseFloat(targetMatch[1].replace(/,/g, ''));
      }

      // Risk/Reward line
      const rrMatch = line.match(/risk\s*\/\s*reward\s*\d*\s*:?\s*([\d.]+)/i);
      if (rrMatch) {
        riskReward = parseFloat(rrMatch[1]);
      }

      // Profit/Loss line
      const profitMatch = lower.match(/(?:profit|loss)\s*(-?[\d,]+\.?\d*)/);
      if (profitMatch) {
        profitPoints = parseFloat(profitMatch[1].replace(/,/g, ''));
        if (lower.includes('loss')) {
          profitPoints = -Math.abs(profitPoints);
        }
      }
    }

    if (!entry || !stopLoss) return null;

    // Calculate risk
    const risk = Math.abs(entry - stopLoss);

    // If takeProfit not found, try to derive it
    if (!takeProfit && riskReward && risk) {
      if (direction === 'long') {
        takeProfit = entry + risk * riskReward;
      } else {
        takeProfit = entry - risk * riskReward;
      }
    }

    // Calculate R:R if not provided
    if (!riskReward && takeProfit && risk) {
      const reward = Math.abs(takeProfit - entry);
      riskReward = reward / risk;
    }

    // Calculate points P&L if not provided
    const pointsPL = profitPoints !== null ? profitPoints : (
      takeProfit ? (direction === 'long' ? takeProfit - entry : entry - takeProfit) : 0
    );

    // Determine result
    let result: 'win' | 'loss' | 'breakeven';
    if (Math.abs(pointsPL) < 0.001) {
      result = 'breakeven';
    } else if (pointsPL > 0) {
      result = 'win';
    } else {
      result = 'loss';
    }

    // Derive exit price from pointsPL
    const exitPrice = direction === 'long' ? entry + pointsPL : entry - pointsPL;

    return {
      direction,
      entry: Math.round(entry * 100) / 100,
      exitPrice: Math.round(exitPrice * 100) / 100,
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
      riskReward: Math.round(riskReward * 100) / 100,
      pointsPL: Math.round(pointsPL * 100) / 100,
      result,
    };
  } catch {
    return null;
  }
}
