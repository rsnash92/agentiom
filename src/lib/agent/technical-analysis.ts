/**
 * Technical Analysis Module
 * Calculates technical indicators for trading decisions:
 * - Moving Averages (SMA, EMA)
 * - RSI (Relative Strength Index)
 * - MACD (Moving Average Convergence Divergence)
 * - Bollinger Bands
 * - ATR (Average True Range)
 * - Support/Resistance levels
 */

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number; // Unix timestamp in ms (matches Hyperliquid CandleData)
}

export interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  ema12: number | null;
  ema26: number | null;
  rsi14: number | null;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  } | null;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  } | null;
  atr14: number | null;
  vwap: number | null;
  volumeProfile: {
    avgVolume: number;
    volumeChange: number;
    isHighVolume: boolean;
  } | null;
  trendDirection: 'bullish' | 'bearish' | 'neutral';
  signals: TechnicalSignal[];
}

export interface TechnicalSignal {
  indicator: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  description: string;
}

export interface SupportResistance {
  supports: number[];
  resistances: number[];
  nearestSupport: number | null;
  nearestResistance: number | null;
}

/**
 * Calculate all technical indicators from candle data
 */
export function calculateIndicators(candles: Candle[]): TechnicalIndicators {
  if (candles.length < 2) {
    return getEmptyIndicators();
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);
  const currentPrice = closes[closes.length - 1];

  const signals: TechnicalSignal[] = [];

  // Moving Averages
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  // RSI
  const rsi14 = calculateRSI(closes, 14);
  if (rsi14 !== null) {
    if (rsi14 < 30) {
      signals.push({
        indicator: 'RSI',
        signal: 'bullish',
        strength: Math.min(100, (30 - rsi14) * 3),
        description: `RSI oversold at ${rsi14.toFixed(1)}`,
      });
    } else if (rsi14 > 70) {
      signals.push({
        indicator: 'RSI',
        signal: 'bearish',
        strength: Math.min(100, (rsi14 - 70) * 3),
        description: `RSI overbought at ${rsi14.toFixed(1)}`,
      });
    }
  }

  // MACD
  const macd = calculateMACD(closes);
  if (macd) {
    if (macd.histogram > 0 && macd.macd > macd.signal) {
      signals.push({
        indicator: 'MACD',
        signal: 'bullish',
        strength: Math.min(100, Math.abs(macd.histogram) * 1000),
        description: 'MACD bullish crossover',
      });
    } else if (macd.histogram < 0 && macd.macd < macd.signal) {
      signals.push({
        indicator: 'MACD',
        signal: 'bearish',
        strength: Math.min(100, Math.abs(macd.histogram) * 1000),
        description: 'MACD bearish crossover',
      });
    }
  }

  // Bollinger Bands
  const bollingerBands = calculateBollingerBands(closes, 20, 2);
  if (bollingerBands) {
    if (currentPrice < bollingerBands.lower) {
      signals.push({
        indicator: 'Bollinger',
        signal: 'bullish',
        strength: Math.min(100, ((bollingerBands.lower - currentPrice) / currentPrice) * 1000),
        description: 'Price below lower Bollinger Band',
      });
    } else if (currentPrice > bollingerBands.upper) {
      signals.push({
        indicator: 'Bollinger',
        signal: 'bearish',
        strength: Math.min(100, ((currentPrice - bollingerBands.upper) / currentPrice) * 1000),
        description: 'Price above upper Bollinger Band',
      });
    }
  }

  // ATR
  const atr14 = calculateATR(highs, lows, closes, 14);

  // VWAP
  const vwap = calculateVWAP(highs, lows, closes, volumes);

  // Volume Profile
  const volumeProfile = analyzeVolume(volumes);
  if (volumeProfile?.isHighVolume) {
    signals.push({
      indicator: 'Volume',
      signal: 'neutral',
      strength: Math.min(100, volumeProfile.volumeChange),
      description: `High volume: ${volumeProfile.volumeChange.toFixed(0)}% above average`,
    });
  }

  // Moving Average Crossover
  if (sma20 !== null && sma50 !== null) {
    if (currentPrice > sma20 && sma20 > sma50) {
      signals.push({
        indicator: 'MA',
        signal: 'bullish',
        strength: 60,
        description: 'Price above SMA20 > SMA50 (bullish trend)',
      });
    } else if (currentPrice < sma20 && sma20 < sma50) {
      signals.push({
        indicator: 'MA',
        signal: 'bearish',
        strength: 60,
        description: 'Price below SMA20 < SMA50 (bearish trend)',
      });
    }
  }

  // Determine overall trend
  const trendDirection = determineTrend(signals, currentPrice, sma20, sma50);

  return {
    sma20,
    sma50,
    ema12,
    ema26,
    rsi14,
    macd,
    bollingerBands,
    atr14,
    vwap,
    volumeProfile,
    trendDirection,
    signals,
  };
}

/**
 * Simple Moving Average
 */
function calculateSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

/**
 * Exponential Moving Average
 */
function calculateEMA(data: number[], period: number): number | null {
  if (data.length < period) return null;

  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Relative Strength Index
 */
function calculateRSI(data: number[], period: number): number | null {
  if (data.length < period + 1) return null;

  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  const gains = changes.map(c => (c > 0 ? c : 0));
  const losses = changes.map(c => (c < 0 ? Math.abs(c) : 0));

  let avgGain = gains.slice(0, period).reduce((sum, g) => sum + g, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, l) => sum + l, 0) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(data: number[]): { macd: number; signal: number; histogram: number } | null {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);

  if (ema12 === null || ema26 === null) return null;

  const macdLine = ema12 - ema26;

  // Calculate signal line (9-period EMA of MACD)
  // Simplified: use recent MACD values approximation
  const signal = macdLine * 0.8; // Approximate
  const histogram = macdLine - signal;

  return { macd: macdLine, signal, histogram };
}

/**
 * Bollinger Bands
 */
function calculateBollingerBands(
  data: number[],
  period: number,
  stdDevMultiplier: number
): { upper: number; middle: number; lower: number; bandwidth: number } | null {
  if (data.length < period) return null;

  const slice = data.slice(-period);
  const middle = slice.reduce((sum, val) => sum + val, 0) / period;

  const squaredDiffs = slice.map(val => Math.pow(val - middle, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = middle + stdDevMultiplier * stdDev;
  const lower = middle - stdDevMultiplier * stdDev;
  const bandwidth = ((upper - lower) / middle) * 100;

  return { upper, middle, lower, bandwidth };
}

/**
 * Average True Range
 */
function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number | null {
  if (highs.length < period + 1) return null;

  const trueRanges: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const highLow = highs[i] - lows[i];
    const highClose = Math.abs(highs[i] - closes[i - 1]);
    const lowClose = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(highLow, highClose, lowClose));
  }

  // Simple ATR (SMA of True Range)
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
}

/**
 * Volume Weighted Average Price
 */
function calculateVWAP(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): number | null {
  if (highs.length === 0) return null;

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < highs.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    cumulativeTPV += typicalPrice * volumes[i];
    cumulativeVolume += volumes[i];
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : null;
}

/**
 * Analyze volume patterns
 */
function analyzeVolume(
  volumes: number[]
): { avgVolume: number; volumeChange: number; isHighVolume: boolean } | null {
  if (volumes.length < 20) return null;

  const avgVolume = volumes.slice(0, -1).reduce((sum, v) => sum + v, 0) / (volumes.length - 1);
  const currentVolume = volumes[volumes.length - 1];
  const volumeChange = ((currentVolume - avgVolume) / avgVolume) * 100;

  return {
    avgVolume,
    volumeChange,
    isHighVolume: volumeChange > 50, // 50% above average
  };
}

/**
 * Determine overall trend from signals
 */
function determineTrend(
  signals: TechnicalSignal[],
  currentPrice: number,
  sma20: number | null,
  sma50: number | null
): 'bullish' | 'bearish' | 'neutral' {
  let bullishScore = 0;
  let bearishScore = 0;

  for (const signal of signals) {
    if (signal.signal === 'bullish') {
      bullishScore += signal.strength;
    } else if (signal.signal === 'bearish') {
      bearishScore += signal.strength;
    }
  }

  // Add trend from moving averages
  if (sma20 !== null && sma50 !== null) {
    if (currentPrice > sma20 && currentPrice > sma50) {
      bullishScore += 50;
    } else if (currentPrice < sma20 && currentPrice < sma50) {
      bearishScore += 50;
    }
  }

  if (bullishScore > bearishScore + 50) return 'bullish';
  if (bearishScore > bullishScore + 50) return 'bearish';
  return 'neutral';
}

/**
 * Calculate support and resistance levels
 */
export function calculateSupportResistance(candles: Candle[]): SupportResistance {
  if (candles.length < 10) {
    return { supports: [], resistances: [], nearestSupport: null, nearestResistance: null };
  }

  const currentPrice = candles[candles.length - 1].close;
  const levels: { price: number; type: 'support' | 'resistance' }[] = [];

  // Find pivot points (local highs and lows)
  for (let i = 2; i < candles.length - 2; i++) {
    const prev2 = candles[i - 2];
    const prev1 = candles[i - 1];
    const curr = candles[i];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    // Local high (resistance)
    if (
      curr.high > prev1.high &&
      curr.high > prev2.high &&
      curr.high > next1.high &&
      curr.high > next2.high
    ) {
      levels.push({ price: curr.high, type: 'resistance' });
    }

    // Local low (support)
    if (
      curr.low < prev1.low &&
      curr.low < prev2.low &&
      curr.low < next1.low &&
      curr.low < next2.low
    ) {
      levels.push({ price: curr.low, type: 'support' });
    }
  }

  // Cluster nearby levels
  const clustered = clusterLevels(levels, currentPrice * 0.01); // 1% clustering

  const supports = clustered
    .filter(l => l.type === 'support')
    .map(l => l.price)
    .sort((a, b) => b - a);

  const resistances = clustered
    .filter(l => l.type === 'resistance')
    .map(l => l.price)
    .sort((a, b) => a - b);

  const nearestSupport = supports.find(s => s < currentPrice) || null;
  const nearestResistance = resistances.find(r => r > currentPrice) || null;

  return { supports, resistances, nearestSupport, nearestResistance };
}

/**
 * Cluster nearby price levels
 */
function clusterLevels(
  levels: { price: number; type: 'support' | 'resistance' }[],
  threshold: number
): { price: number; type: 'support' | 'resistance' }[] {
  const sorted = [...levels].sort((a, b) => a.price - b.price);
  const clustered: { price: number; type: 'support' | 'resistance' }[] = [];

  for (const level of sorted) {
    const existing = clustered.find(c => Math.abs(c.price - level.price) < threshold);
    if (!existing) {
      clustered.push(level);
    }
  }

  return clustered;
}

/**
 * Format indicators for LLM prompt
 */
export function formatIndicatorsForPrompt(indicators: TechnicalIndicators): string {
  const lines: string[] = ['Technical Analysis:'];

  if (indicators.sma20 !== null && indicators.sma50 !== null) {
    lines.push(`- Moving Averages: SMA20=$${indicators.sma20.toFixed(2)}, SMA50=$${indicators.sma50.toFixed(2)}`);
  }

  if (indicators.rsi14 !== null) {
    const rsiZone = indicators.rsi14 < 30 ? '(oversold)' : indicators.rsi14 > 70 ? '(overbought)' : '';
    lines.push(`- RSI(14): ${indicators.rsi14.toFixed(1)} ${rsiZone}`);
  }

  if (indicators.macd) {
    const macdSignal = indicators.macd.histogram > 0 ? 'bullish' : 'bearish';
    lines.push(`- MACD: ${indicators.macd.macd.toFixed(4)} (${macdSignal})`);
  }

  if (indicators.bollingerBands) {
    lines.push(
      `- Bollinger Bands: Upper=$${indicators.bollingerBands.upper.toFixed(2)}, ` +
      `Lower=$${indicators.bollingerBands.lower.toFixed(2)}, ` +
      `Bandwidth=${indicators.bollingerBands.bandwidth.toFixed(1)}%`
    );
  }

  if (indicators.atr14 !== null) {
    lines.push(`- ATR(14): $${indicators.atr14.toFixed(2)}`);
  }

  if (indicators.vwap !== null) {
    lines.push(`- VWAP: $${indicators.vwap.toFixed(2)}`);
  }

  if (indicators.volumeProfile) {
    lines.push(
      `- Volume: ${indicators.volumeProfile.isHighVolume ? 'HIGH' : 'Normal'} ` +
      `(${indicators.volumeProfile.volumeChange.toFixed(0)}% vs avg)`
    );
  }

  lines.push(`- Overall Trend: ${indicators.trendDirection.toUpperCase()}`);

  if (indicators.signals.length > 0) {
    lines.push('- Signals:');
    for (const signal of indicators.signals.slice(0, 5)) {
      lines.push(`  • ${signal.indicator}: ${signal.description}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get empty indicators (for error cases)
 */
function getEmptyIndicators(): TechnicalIndicators {
  return {
    sma20: null,
    sma50: null,
    ema12: null,
    ema26: null,
    rsi14: null,
    macd: null,
    bollingerBands: null,
    atr14: null,
    vwap: null,
    volumeProfile: null,
    trendDirection: 'neutral',
    signals: [],
  };
}
