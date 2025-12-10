/**
 * Market Regime Detection Module
 *
 * Classifies current market conditions to help agents adapt their trading strategies:
 * - TRENDING_UP: Clear uptrend - favor buying dips
 * - TRENDING_DOWN: Clear downtrend - favor selling rallies
 * - RANGING: Sideways market - mean reversion works
 * - HIGH_VOLATILITY: Choppy conditions - reduce position sizes
 * - LOW_VOLATILITY: Quiet market - potential breakout setup
 */

import type { TechnicalIndicators } from './technical-analysis';

// ==================== Types ====================

export type MarketRegime =
  | 'TRENDING_UP'
  | 'TRENDING_DOWN'
  | 'RANGING'
  | 'HIGH_VOLATILITY'
  | 'LOW_VOLATILITY';

export interface RegimeDetectionInput {
  // Price data
  currentPrice: number;
  priceChange24h: number; // Percentage
  priceChange7d?: number; // Percentage (if available)

  // Technical indicators (optional but recommended)
  indicators?: TechnicalIndicators;

  // Volume context
  volume24h?: number;
  avgVolume?: number; // Average volume for comparison
}

export interface RegimeDetectionResult {
  regime: MarketRegime;
  confidence: number; // 0-100%
  reasoning: string;
  tradingGuidance: string;
  riskMultiplier: number; // 0.5 = reduce size by half, 1.5 = can size up
}

// ==================== Detection Logic ====================

/**
 * Detect the current market regime based on price action and indicators
 */
export function detectMarketRegime(input: RegimeDetectionInput): RegimeDetectionResult {
  const signals: {
    trending: number; // -100 to +100 (negative = down, positive = up)
    volatility: number; // 0-100 (higher = more volatile)
    ranging: number; // 0-100 (higher = more ranging)
  } = {
    trending: 0,
    volatility: 0,
    ranging: 0,
  };

  const reasons: string[] = [];

  // ==================== Price Change Analysis ====================

  // 24h price change
  if (input.priceChange24h > 5) {
    signals.trending += 40;
    reasons.push(`Strong 24h gain (+${input.priceChange24h.toFixed(1)}%)`);
  } else if (input.priceChange24h > 2) {
    signals.trending += 20;
    reasons.push(`Positive 24h (+${input.priceChange24h.toFixed(1)}%)`);
  } else if (input.priceChange24h < -5) {
    signals.trending -= 40;
    reasons.push(`Strong 24h decline (${input.priceChange24h.toFixed(1)}%)`);
  } else if (input.priceChange24h < -2) {
    signals.trending -= 20;
    reasons.push(`Negative 24h (${input.priceChange24h.toFixed(1)}%)`);
  } else {
    signals.ranging += 30;
    reasons.push(`Flat 24h (${input.priceChange24h.toFixed(1)}%)`);
  }

  // 7d price change (if available)
  if (input.priceChange7d !== undefined) {
    if (input.priceChange7d > 10) {
      signals.trending += 30;
      reasons.push(`Weekly uptrend (+${input.priceChange7d.toFixed(1)}%)`);
    } else if (input.priceChange7d < -10) {
      signals.trending -= 30;
      reasons.push(`Weekly downtrend (${input.priceChange7d.toFixed(1)}%)`);
    }
  }

  // ==================== Technical Indicator Analysis ====================

  if (input.indicators) {
    const ind = input.indicators;

    // RSI Analysis
    if (ind.rsi14 != null) {
      if (ind.rsi14 > 70) {
        signals.trending += 15;
        signals.volatility += 10;
        reasons.push(`RSI overbought (${ind.rsi14.toFixed(1)})`);
      } else if (ind.rsi14 < 30) {
        signals.trending -= 15;
        signals.volatility += 10;
        reasons.push(`RSI oversold (${ind.rsi14.toFixed(1)})`);
      } else if (ind.rsi14 >= 45 && ind.rsi14 <= 55) {
        signals.ranging += 20;
        reasons.push(`RSI neutral (${ind.rsi14.toFixed(1)})`);
      }
    }

    // MACD Analysis
    if (ind.macd != null) {
      if (ind.macd.histogram > 0) {
        signals.trending += 15;
      } else {
        signals.trending -= 15;
      }
    }

    // EMA Trend Analysis (using 12 and 26 EMAs)
    if (ind.ema12 != null && ind.ema26 != null) {
      const emaDiff = ((ind.ema12 - ind.ema26) / ind.ema26) * 100;

      if (emaDiff > 2) {
        signals.trending += 25;
        reasons.push(`EMAs bullish aligned`);
      } else if (emaDiff < -2) {
        signals.trending -= 25;
        reasons.push(`EMAs bearish aligned`);
      } else {
        signals.ranging += 15;
      }
    }

    // Bollinger Band Width for volatility
    if (ind.bollingerBands != null) {
      const bb = ind.bollingerBands;
      const bbWidth = bb.bandwidth; // Already calculated as percentage

      if (bbWidth > 8) {
        signals.volatility += 40;
        reasons.push(`Wide BBands (${bbWidth.toFixed(1)}%)`);
      } else if (bbWidth < 3) {
        signals.volatility -= 20;
        reasons.push(`Tight BBands (${bbWidth.toFixed(1)}%) - squeeze`);
      }
    }

    // Trend direction from analysis
    if (ind.trendDirection === 'bullish') {
      signals.trending += 20;
      reasons.push('Trend direction: bullish');
    } else if (ind.trendDirection === 'bearish') {
      signals.trending -= 20;
      reasons.push('Trend direction: bearish');
    }

    // ATR-based volatility
    if (ind.atr14 != null) {
      const atrPercent = (ind.atr14 / input.currentPrice) * 100;
      if (atrPercent > 4) {
        signals.volatility += 30;
        reasons.push(`High ATR (${atrPercent.toFixed(1)}%)`);
      } else if (atrPercent < 1.5) {
        signals.volatility -= 20;
        reasons.push(`Low ATR (${atrPercent.toFixed(1)}%)`);
      }
    }

    // Volume analysis
    if (ind.volumeProfile?.isHighVolume) {
      signals.volatility += 15;
      reasons.push('High volume');
    }
  }

  // ==================== Volume Analysis ====================

  if (input.volume24h && input.avgVolume) {
    const volumeRatio = input.volume24h / input.avgVolume;

    if (volumeRatio > 1.5) {
      signals.volatility += 20;
      reasons.push(`High volume (${(volumeRatio * 100).toFixed(0)}% of avg)`);
    } else if (volumeRatio < 0.5) {
      signals.ranging += 15;
      reasons.push(`Low volume (${(volumeRatio * 100).toFixed(0)}% of avg)`);
    }
  }

  // ==================== Determine Regime ====================

  let regime: MarketRegime;
  let confidence: number;
  let tradingGuidance: string;
  let riskMultiplier: number;

  // Normalize signals
  signals.trending = Math.max(-100, Math.min(100, signals.trending));
  signals.volatility = Math.max(0, Math.min(100, signals.volatility));
  signals.ranging = Math.max(0, Math.min(100, signals.ranging));

  // High volatility takes precedence
  if (signals.volatility > 60) {
    regime = 'HIGH_VOLATILITY';
    confidence = Math.min(90, 50 + signals.volatility / 2);
    tradingGuidance = 'Reduce position sizes, use wider stops, avoid overleveraging';
    riskMultiplier = 0.5;
  }
  // Low volatility (potential breakout)
  else if (signals.volatility < 20 && signals.ranging > 40) {
    regime = 'LOW_VOLATILITY';
    confidence = Math.min(85, 50 + signals.ranging / 2);
    tradingGuidance = 'Watch for breakout, consider straddle positions or breakout entries';
    riskMultiplier = 0.75;
  }
  // Strong uptrend
  else if (signals.trending >= 40) {
    regime = 'TRENDING_UP';
    confidence = Math.min(90, 50 + signals.trending / 2);
    tradingGuidance = 'Buy dips, trail stops higher, avoid shorting';
    riskMultiplier = 1.2;
  }
  // Strong downtrend
  else if (signals.trending <= -40) {
    regime = 'TRENDING_DOWN';
    confidence = Math.min(90, 50 + Math.abs(signals.trending) / 2);
    tradingGuidance = 'Sell rallies, trail stops lower, avoid longing';
    riskMultiplier = 1.2;
  }
  // Ranging/sideways
  else {
    regime = 'RANGING';
    confidence = Math.min(80, 50 + signals.ranging / 2);
    tradingGuidance = 'Mean reversion strategies, buy support, sell resistance';
    riskMultiplier = 0.8;
  }

  return {
    regime,
    confidence: Math.round(confidence),
    reasoning: reasons.join('; '),
    tradingGuidance,
    riskMultiplier,
  };
}

/**
 * Format market regime for LLM prompt
 */
export function formatRegimeForPrompt(result: RegimeDetectionResult): string {
  const regimeDescriptions: Record<MarketRegime, string> = {
    TRENDING_UP: 'UPTREND - Price is trending higher with momentum',
    TRENDING_DOWN: 'DOWNTREND - Price is trending lower with momentum',
    RANGING: 'SIDEWAYS - Price is consolidating in a range',
    HIGH_VOLATILITY: 'HIGH VOLATILITY - Choppy, erratic price action',
    LOW_VOLATILITY: 'LOW VOLATILITY - Quiet market, potential breakout brewing',
  };

  return `
Market Regime: ${regimeDescriptions[result.regime]}
Confidence: ${result.confidence}%
Analysis: ${result.reasoning}
Trading Guidance: ${result.tradingGuidance}
Position Size Adjustment: ${result.riskMultiplier}x normal
`.trim();
}

/**
 * Get regime-specific strategy adjustments
 */
export function getRegimeAdjustments(regime: MarketRegime): {
  preferredDirection: 'long' | 'short' | 'neutral';
  entryStrategy: string;
  stopLossMultiplier: number;
  takeProfitMultiplier: number;
} {
  switch (regime) {
    case 'TRENDING_UP':
      return {
        preferredDirection: 'long',
        entryStrategy: 'Buy pullbacks to support/EMAs',
        stopLossMultiplier: 1.0,
        takeProfitMultiplier: 1.5, // Let winners run
      };

    case 'TRENDING_DOWN':
      return {
        preferredDirection: 'short',
        entryStrategy: 'Sell rallies to resistance/EMAs',
        stopLossMultiplier: 1.0,
        takeProfitMultiplier: 1.5, // Let winners run
      };

    case 'RANGING':
      return {
        preferredDirection: 'neutral',
        entryStrategy: 'Buy support, sell resistance',
        stopLossMultiplier: 0.8, // Tighter stops
        takeProfitMultiplier: 0.8, // Take profits quicker
      };

    case 'HIGH_VOLATILITY':
      return {
        preferredDirection: 'neutral',
        entryStrategy: 'Wait for clarity or use smaller sizes',
        stopLossMultiplier: 1.5, // Wider stops
        takeProfitMultiplier: 1.0,
      };

    case 'LOW_VOLATILITY':
      return {
        preferredDirection: 'neutral',
        entryStrategy: 'Prepare for breakout, use pending orders',
        stopLossMultiplier: 0.7, // Tight stops
        takeProfitMultiplier: 2.0, // Target larger moves
      };
  }
}
