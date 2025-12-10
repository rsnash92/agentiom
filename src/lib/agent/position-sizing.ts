/**
 * Dynamic Position Sizing Module
 * Implements various position sizing strategies:
 * - Kelly Criterion (for optimal growth)
 * - Volatility-adjusted sizing (ATR-based)
 * - Fixed fractional (percentage of account)
 * - Risk-per-trade (fixed dollar risk)
 */

export type PositionSizingStrategy =
  | 'fixed_fractional'
  | 'kelly_criterion'
  | 'volatility_adjusted'
  | 'risk_per_trade';

export interface PositionSizingConfig {
  strategy: PositionSizingStrategy;
  // Fixed fractional: % of account per trade
  maxAccountPercent: number;
  // Risk per trade: max loss $ per trade
  maxRiskPerTrade: number;
  // Kelly: win rate and avg win/loss ratio from history
  kellyFraction: number; // Usually 0.25-0.5 of full Kelly for safety
  // Volatility: ATR multiplier
  volatilityMultiplier: number;
}

export interface PositionSizingInput {
  accountValue: number;
  freeCollateral: number;
  currentPrice: number;
  stopLossPercent?: number;
  stopLossPrice?: number;
  volatility24h?: number;
  atr?: number;
  winRate?: number;
  avgWinLossRatio?: number;
  confidence: number;
  leverage: number;
  maxPositionSizeUsd: number;
}

export interface PositionSizingResult {
  sizeUsd: number;
  sizeAsset: number;
  riskAmount: number;
  riskPercent: number;
  reasoning: string;
}

const DEFAULT_CONFIG: PositionSizingConfig = {
  strategy: 'fixed_fractional',
  maxAccountPercent: 5, // 5% of account per position
  maxRiskPerTrade: 100, // $100 max risk per trade
  kellyFraction: 0.25, // Quarter Kelly for safety
  volatilityMultiplier: 1.5,
};

/**
 * Calculate optimal position size based on strategy and market conditions
 */
export function calculatePositionSize(
  input: PositionSizingInput,
  config: Partial<PositionSizingConfig> = {}
): PositionSizingResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  let result: PositionSizingResult;

  switch (cfg.strategy) {
    case 'kelly_criterion':
      result = calculateKellyCriterion(input, cfg);
      break;
    case 'volatility_adjusted':
      result = calculateVolatilityAdjusted(input, cfg);
      break;
    case 'risk_per_trade':
      result = calculateRiskPerTrade(input, cfg);
      break;
    case 'fixed_fractional':
    default:
      result = calculateFixedFractional(input, cfg);
  }

  // Apply confidence scaling (lower confidence = smaller position)
  const confidenceMultiplier = Math.min(1, input.confidence / 100);
  result.sizeUsd *= confidenceMultiplier;
  result.sizeAsset *= confidenceMultiplier;

  // Apply policy limits
  result = applyLimits(result, input, cfg);

  return result;
}

/**
 * Fixed Fractional: Risk a fixed % of account per trade
 */
function calculateFixedFractional(
  input: PositionSizingInput,
  config: PositionSizingConfig
): PositionSizingResult {
  const maxPositionUsd = input.accountValue * (config.maxAccountPercent / 100);
  const sizeUsd = Math.min(maxPositionUsd, input.freeCollateral * 0.8);

  const riskPercent = input.stopLossPercent || 3;
  const riskAmount = sizeUsd * (riskPercent / 100);

  return {
    sizeUsd,
    sizeAsset: sizeUsd / input.currentPrice,
    riskAmount,
    riskPercent,
    reasoning: `Fixed fractional: ${config.maxAccountPercent}% of $${input.accountValue.toFixed(2)} account = $${sizeUsd.toFixed(2)}`,
  };
}

/**
 * Kelly Criterion: Optimal position size for geometric growth
 * Kelly % = W - [(1 - W) / R]
 * W = Win rate, R = Average win/loss ratio
 */
function calculateKellyCriterion(
  input: PositionSizingInput,
  config: PositionSizingConfig
): PositionSizingResult {
  const winRate = input.winRate || 0.5;
  const avgWinLossRatio = input.avgWinLossRatio || 1.5;

  // Calculate Kelly percentage
  const kellyPercent = winRate - ((1 - winRate) / avgWinLossRatio);

  // Apply fractional Kelly (safer)
  const adjustedKelly = Math.max(0, kellyPercent * config.kellyFraction);

  // Convert to position size
  const sizeUsd = input.accountValue * adjustedKelly;

  const riskPercent = input.stopLossPercent || 3;
  const riskAmount = sizeUsd * (riskPercent / 100);

  return {
    sizeUsd,
    sizeAsset: sizeUsd / input.currentPrice,
    riskAmount,
    riskPercent,
    reasoning: `Kelly Criterion (${(config.kellyFraction * 100).toFixed(0)}% Kelly): Win rate ${(winRate * 100).toFixed(1)}%, W/L ratio ${avgWinLossRatio.toFixed(2)} = ${(adjustedKelly * 100).toFixed(2)}% of account`,
  };
}

/**
 * Volatility-Adjusted: Scale position inversely with volatility
 * Higher volatility = smaller position
 */
function calculateVolatilityAdjusted(
  input: PositionSizingInput,
  config: PositionSizingConfig
): PositionSizingResult {
  // Use 24h volatility or ATR
  const volatility = input.atr || input.volatility24h || 5;

  // Base position size (2% of account)
  const basePercent = 2;

  // Adjust for volatility: normalize to ~3% baseline
  // If volatility is 3%, size = base
  // If volatility is 6%, size = base / 2
  // If volatility is 1.5%, size = base * 2
  const volatilityFactor = 3 / Math.max(volatility, 0.5);
  const adjustedPercent = basePercent * volatilityFactor * config.volatilityMultiplier;

  // Cap at max account percent
  const finalPercent = Math.min(adjustedPercent, config.maxAccountPercent);
  const sizeUsd = input.accountValue * (finalPercent / 100);

  return {
    sizeUsd,
    sizeAsset: sizeUsd / input.currentPrice,
    riskAmount: sizeUsd * (volatility / 100),
    riskPercent: volatility,
    reasoning: `Volatility-adjusted: ${volatility.toFixed(2)}% volatility → ${finalPercent.toFixed(2)}% position = $${sizeUsd.toFixed(2)}`,
  };
}

/**
 * Risk Per Trade: Fixed dollar amount at risk
 * Position size = Risk amount / (Stop loss %)
 */
function calculateRiskPerTrade(
  input: PositionSizingInput,
  config: PositionSizingConfig
): PositionSizingResult {
  const maxRisk = Math.min(
    config.maxRiskPerTrade,
    input.accountValue * 0.02 // Cap at 2% of account
  );

  const stopLossPercent = input.stopLossPercent || 3;

  // Position size = Risk / Stop loss %
  // If we risk $100 with 3% stop loss, position = $100 / 0.03 = $3,333
  const sizeUsd = maxRisk / (stopLossPercent / 100);

  return {
    sizeUsd,
    sizeAsset: sizeUsd / input.currentPrice,
    riskAmount: maxRisk,
    riskPercent: stopLossPercent,
    reasoning: `Risk per trade: $${maxRisk.toFixed(2)} risk with ${stopLossPercent}% stop = $${sizeUsd.toFixed(2)} position`,
  };
}

/**
 * Apply policy limits and sanity checks
 */
function applyLimits(
  result: PositionSizingResult,
  input: PositionSizingInput,
  config: PositionSizingConfig
): PositionSizingResult {
  let { sizeUsd, reasoning } = result;
  const limits: string[] = [];

  // Limit 1: Max position size from policy
  if (sizeUsd > input.maxPositionSizeUsd) {
    sizeUsd = input.maxPositionSizeUsd;
    limits.push(`max policy ($${input.maxPositionSizeUsd})`);
  }

  // Limit 2: Free collateral (with margin for leverage)
  const maxFromCollateral = input.freeCollateral * input.leverage * 0.8;
  if (sizeUsd > maxFromCollateral) {
    sizeUsd = maxFromCollateral;
    limits.push(`collateral ($${maxFromCollateral.toFixed(2)})`);
  }

  // Limit 3: Max account percent
  const maxFromAccount = input.accountValue * (config.maxAccountPercent / 100);
  if (sizeUsd > maxFromAccount) {
    sizeUsd = maxFromAccount;
    limits.push(`${config.maxAccountPercent}% account`);
  }

  // Limit 4: Minimum position size ($10)
  const minSize = 10;
  if (sizeUsd < minSize) {
    sizeUsd = 0;
    limits.push('below minimum');
  }

  // Recalculate asset size and risk
  const sizeAsset = sizeUsd / input.currentPrice;
  const riskAmount = sizeUsd * (result.riskPercent / 100);

  if (limits.length > 0) {
    reasoning += ` → Limited by ${limits.join(', ')} → $${sizeUsd.toFixed(2)}`;
  }

  return {
    sizeUsd,
    sizeAsset,
    riskAmount,
    riskPercent: result.riskPercent,
    reasoning,
  };
}

/**
 * Calculate win rate and avg win/loss ratio from trade history
 */
export function calculateTradeStatistics(
  trades: Array<{ pnl: number; pnlPercent: number }>
): { winRate: number; avgWinLossRatio: number; expectancy: number } {
  if (trades.length === 0) {
    return { winRate: 0.5, avgWinLossRatio: 1.5, expectancy: 0 };
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);

  const winRate = wins.length / trades.length;

  const avgWin = wins.length > 0
    ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length
    : 0;

  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length)
    : 1; // Avoid division by zero

  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : 1.5;

  // Expectancy = (Win% × Avg Win) - (Loss% × Avg Loss)
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

  return { winRate, avgWinLossRatio, expectancy };
}
