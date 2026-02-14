export interface ParsedTradeData {
  direction: 'long' | 'short';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  pointsPL: number;
  result: 'win' | 'loss' | 'breakeven';
}

/**
 * Parse TradingView Position Tool HTML clipboard content.
 * TradingView's rich clipboard often contains structured HTML with price data
 * in table cells, spans, or data attributes.
 */
export function parseTradingViewHTML(html: string): ParsedTradeData | null {
  if (!html || html.trim().length === 0) return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const text = doc.body.textContent || '';

    // Try parsing the extracted text content with the text parser
    const fromText = parseTradingViewClipboard(text);
    if (fromText) return fromText;

    // Try to extract numbers from any structured HTML elements
    const allText = doc.body.innerHTML;

    // Look for direction
    let direction: 'long' | 'short' | null = null;
    const lowerAll = allText.toLowerCase();
    if (lowerAll.includes('long position') || lowerAll.includes('long')) {
      direction = 'long';
    } else if (lowerAll.includes('short position') || lowerAll.includes('short')) {
      direction = 'short';
    }
    if (!direction) return null;

    // Extract all numbers from the HTML
    const numbers = allText.match(/[\d,]+\.?\d*/g)?.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n) && n > 0) || [];

    // Look for labeled values in the HTML
    let entry = 0, stopLoss = 0, takeProfit = 0;

    const entryMatch = allText.match(/(?:entry|open|price)[:\s]*([\d,]+\.?\d*)/i);
    if (entryMatch) entry = parseFloat(entryMatch[1].replace(/,/g, ''));

    const stopMatch = allText.match(/(?:stop|sl)[:\s]*([\d,]+\.?\d*)/i);
    if (stopMatch) stopLoss = parseFloat(stopMatch[1].replace(/,/g, ''));

    const targetMatch = allText.match(/(?:target|tp|take\s*profit)[:\s]*([\d,]+\.?\d*)/i);
    if (targetMatch) takeProfit = parseFloat(targetMatch[1].replace(/,/g, ''));

    if (!entry || !stopLoss) return null;

    const risk = Math.abs(entry - stopLoss);
    const riskReward = takeProfit && risk ? Math.abs(takeProfit - entry) / risk : 0;
    const pointsPL = takeProfit ? (direction === 'long' ? takeProfit - entry : entry - takeProfit) : 0;

    let result: 'win' | 'loss' | 'breakeven';
    if (Math.abs(pointsPL) < 0.001) {
      result = 'breakeven';
    } else if (pointsPL > 0) {
      result = 'win';
    } else {
      result = 'loss';
    }

    return {
      direction,
      entry: Math.round(entry * 100) / 100,
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

    return {
      direction,
      entry: Math.round(entry * 100) / 100,
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
