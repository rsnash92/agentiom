/**
 * Trailing Stop-Loss Module
 * Implements various trailing stop strategies:
 * - Percentage-based trailing
 * - ATR-based trailing
 * - Step trailing (moves in increments)
 * - Breakeven stop
 */

export type TrailingStopType =
  | 'percentage'
  | 'atr'
  | 'step'
  | 'breakeven';

export interface TrailingStopConfig {
  type: TrailingStopType;
  // Percentage trailing: trail by X%
  trailPercent: number;
  // ATR trailing: trail by X ATRs
  atrMultiplier: number;
  // Step trailing: move stop every X% gain
  stepPercent: number;
  stepGain: number;
  // Breakeven: move to breakeven after X% gain
  breakevenTriggerPercent: number;
  // Lock profit: trail tighter after X% gain
  lockProfitPercent?: number;
  lockProfitTrailPercent?: number;
}

export interface TrailingStopInput {
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  currentStopLoss?: number;
  highWaterMark?: number; // Highest price since entry (for longs)
  lowWaterMark?: number;  // Lowest price since entry (for shorts)
  atr?: number;
  unrealizedPnlPercent: number;
}

export interface TrailingStopResult {
  newStopLoss: number;
  triggered: boolean;
  reason: string;
  profitLocked?: number;
}

const DEFAULT_CONFIG: TrailingStopConfig = {
  type: 'percentage',
  trailPercent: 2,
  atrMultiplier: 2,
  stepPercent: 1,
  stepGain: 2,
  breakevenTriggerPercent: 2,
  lockProfitPercent: 5,
  lockProfitTrailPercent: 1,
};

/**
 * Calculate new trailing stop level
 */
export function calculateTrailingStop(
  input: TrailingStopInput,
  config: Partial<TrailingStopConfig> = {}
): TrailingStopResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  switch (cfg.type) {
    case 'atr':
      return calculateATRTrailing(input, cfg);
    case 'step':
      return calculateStepTrailing(input, cfg);
    case 'breakeven':
      return calculateBreakevenStop(input, cfg);
    case 'percentage':
    default:
      return calculatePercentageTrailing(input, cfg);
  }
}

/**
 * Percentage-based trailing stop
 * Stop trails the high/low water mark by a fixed percentage
 */
function calculatePercentageTrailing(
  input: TrailingStopInput,
  config: TrailingStopConfig
): TrailingStopResult {
  const { side, entryPrice, currentPrice, currentStopLoss, unrealizedPnlPercent } = input;

  // Determine trail percent (tighter after profit threshold)
  let trailPercent = config.trailPercent;
  if (
    config.lockProfitPercent &&
    config.lockProfitTrailPercent &&
    unrealizedPnlPercent >= config.lockProfitPercent
  ) {
    trailPercent = config.lockProfitTrailPercent;
  }

  let newStopLoss: number;
  let profitLocked: number | undefined;

  if (side === 'long') {
    const highWaterMark = input.highWaterMark || Math.max(entryPrice, currentPrice);
    newStopLoss = highWaterMark * (1 - trailPercent / 100);

    // Calculate profit locked
    if (newStopLoss > entryPrice) {
      profitLocked = ((newStopLoss - entryPrice) / entryPrice) * 100;
    }

    // Only update if higher than current stop
    if (currentStopLoss && newStopLoss <= currentStopLoss) {
      return {
        newStopLoss: currentStopLoss,
        triggered: false,
        reason: `Stop unchanged at $${currentStopLoss.toFixed(2)} (new level $${newStopLoss.toFixed(2)} not higher)`,
      };
    }

    // Check if triggered
    if (currentPrice <= newStopLoss) {
      return {
        newStopLoss,
        triggered: true,
        reason: `Trailing stop triggered: price $${currentPrice.toFixed(2)} <= stop $${newStopLoss.toFixed(2)}`,
        profitLocked,
      };
    }
  } else {
    const lowWaterMark = input.lowWaterMark || Math.min(entryPrice, currentPrice);
    newStopLoss = lowWaterMark * (1 + trailPercent / 100);

    // Calculate profit locked
    if (newStopLoss < entryPrice) {
      profitLocked = ((entryPrice - newStopLoss) / entryPrice) * 100;
    }

    // Only update if lower than current stop
    if (currentStopLoss && newStopLoss >= currentStopLoss) {
      return {
        newStopLoss: currentStopLoss,
        triggered: false,
        reason: `Stop unchanged at $${currentStopLoss.toFixed(2)} (new level $${newStopLoss.toFixed(2)} not lower)`,
      };
    }

    // Check if triggered
    if (currentPrice >= newStopLoss) {
      return {
        newStopLoss,
        triggered: true,
        reason: `Trailing stop triggered: price $${currentPrice.toFixed(2)} >= stop $${newStopLoss.toFixed(2)}`,
        profitLocked,
      };
    }
  }

  return {
    newStopLoss,
    triggered: false,
    reason: `Trailing ${trailPercent}%: stop moved to $${newStopLoss.toFixed(2)}`,
    profitLocked,
  };
}

/**
 * ATR-based trailing stop
 * Stop trails by a multiple of ATR (Average True Range)
 */
function calculateATRTrailing(
  input: TrailingStopInput,
  config: TrailingStopConfig
): TrailingStopResult {
  const { side, entryPrice, currentPrice, currentStopLoss } = input;
  const atr = input.atr || currentPrice * 0.02; // Default 2% if no ATR

  const trailDistance = atr * config.atrMultiplier;
  let newStopLoss: number;

  if (side === 'long') {
    const highWaterMark = input.highWaterMark || Math.max(entryPrice, currentPrice);
    newStopLoss = highWaterMark - trailDistance;

    if (currentStopLoss && newStopLoss <= currentStopLoss) {
      return {
        newStopLoss: currentStopLoss,
        triggered: false,
        reason: `ATR stop unchanged at $${currentStopLoss.toFixed(2)}`,
      };
    }

    if (currentPrice <= newStopLoss) {
      return {
        newStopLoss,
        triggered: true,
        reason: `ATR trailing stop triggered at $${newStopLoss.toFixed(2)}`,
      };
    }
  } else {
    const lowWaterMark = input.lowWaterMark || Math.min(entryPrice, currentPrice);
    newStopLoss = lowWaterMark + trailDistance;

    if (currentStopLoss && newStopLoss >= currentStopLoss) {
      return {
        newStopLoss: currentStopLoss,
        triggered: false,
        reason: `ATR stop unchanged at $${currentStopLoss.toFixed(2)}`,
      };
    }

    if (currentPrice >= newStopLoss) {
      return {
        newStopLoss,
        triggered: true,
        reason: `ATR trailing stop triggered at $${newStopLoss.toFixed(2)}`,
      };
    }
  }

  return {
    newStopLoss,
    triggered: false,
    reason: `ATR trailing (${config.atrMultiplier}x): stop at $${newStopLoss.toFixed(2)}`,
  };
}

/**
 * Step trailing stop
 * Stop moves up in increments as price reaches new gain thresholds
 */
function calculateStepTrailing(
  input: TrailingStopInput,
  config: TrailingStopConfig
): TrailingStopResult {
  const { side, entryPrice, currentPrice, currentStopLoss, unrealizedPnlPercent } = input;

  // Calculate how many steps we've achieved
  const steps = Math.floor(unrealizedPnlPercent / config.stepGain);

  if (steps <= 0) {
    return {
      newStopLoss: currentStopLoss || entryPrice * (side === 'long' ? 0.97 : 1.03),
      triggered: false,
      reason: `Step trailing: waiting for ${config.stepGain}% gain (current: ${unrealizedPnlPercent.toFixed(2)}%)`,
    };
  }

  // Move stop by stepPercent for each step achieved
  const totalStepPercent = steps * config.stepPercent;
  let newStopLoss: number;
  let profitLocked: number;

  if (side === 'long') {
    newStopLoss = entryPrice * (1 + totalStepPercent / 100);
    profitLocked = totalStepPercent;

    if (currentStopLoss && newStopLoss <= currentStopLoss) {
      return {
        newStopLoss: currentStopLoss,
        triggered: false,
        reason: `Step trailing: stop unchanged at $${currentStopLoss.toFixed(2)} (${steps} steps)`,
        profitLocked,
      };
    }

    if (currentPrice <= newStopLoss) {
      return {
        newStopLoss,
        triggered: true,
        reason: `Step trailing stop triggered at $${newStopLoss.toFixed(2)}`,
        profitLocked,
      };
    }
  } else {
    newStopLoss = entryPrice * (1 - totalStepPercent / 100);
    profitLocked = totalStepPercent;

    if (currentStopLoss && newStopLoss >= currentStopLoss) {
      return {
        newStopLoss: currentStopLoss,
        triggered: false,
        reason: `Step trailing: stop unchanged at $${currentStopLoss.toFixed(2)} (${steps} steps)`,
        profitLocked,
      };
    }

    if (currentPrice >= newStopLoss) {
      return {
        newStopLoss,
        triggered: true,
        reason: `Step trailing stop triggered at $${newStopLoss.toFixed(2)}`,
        profitLocked,
      };
    }
  }

  return {
    newStopLoss,
    triggered: false,
    reason: `Step trailing: ${steps} steps, stop at $${newStopLoss.toFixed(2)} (${profitLocked}% locked)`,
    profitLocked,
  };
}

/**
 * Breakeven stop
 * Move stop to breakeven after reaching profit threshold
 */
function calculateBreakevenStop(
  input: TrailingStopInput,
  config: TrailingStopConfig
): TrailingStopResult {
  const { side, entryPrice, currentPrice, currentStopLoss, unrealizedPnlPercent } = input;

  // Haven't reached breakeven trigger yet
  if (unrealizedPnlPercent < config.breakevenTriggerPercent) {
    return {
      newStopLoss: currentStopLoss || entryPrice * (side === 'long' ? 0.97 : 1.03),
      triggered: false,
      reason: `Breakeven: waiting for ${config.breakevenTriggerPercent}% gain (current: ${unrealizedPnlPercent.toFixed(2)}%)`,
    };
  }

  // Move to breakeven (slightly above to cover fees)
  const feeBuffer = 0.001; // 0.1% for fees
  let newStopLoss: number;

  if (side === 'long') {
    newStopLoss = entryPrice * (1 + feeBuffer);

    // Check if already at or above breakeven
    if (currentStopLoss && currentStopLoss >= newStopLoss) {
      // Apply percentage trailing from here
      return calculatePercentageTrailing(
        { ...input, currentStopLoss },
        config
      );
    }

    if (currentPrice <= newStopLoss) {
      return {
        newStopLoss,
        triggered: true,
        reason: `Breakeven stop triggered at $${newStopLoss.toFixed(2)}`,
      };
    }
  } else {
    newStopLoss = entryPrice * (1 - feeBuffer);

    if (currentStopLoss && currentStopLoss <= newStopLoss) {
      return calculatePercentageTrailing(
        { ...input, currentStopLoss },
        config
      );
    }

    if (currentPrice >= newStopLoss) {
      return {
        newStopLoss,
        triggered: true,
        reason: `Breakeven stop triggered at $${newStopLoss.toFixed(2)}`,
      };
    }
  }

  return {
    newStopLoss,
    triggered: false,
    reason: `Breakeven: stop moved to $${newStopLoss.toFixed(2)} (risk-free trade)`,
    profitLocked: 0,
  };
}

/**
 * Update high/low water marks for trailing stop tracking
 */
export function updateWaterMarks(
  current: { highWaterMark?: number; lowWaterMark?: number },
  side: 'long' | 'short',
  currentPrice: number,
  entryPrice: number
): { highWaterMark: number; lowWaterMark: number } {
  if (side === 'long') {
    return {
      highWaterMark: Math.max(
        current.highWaterMark || entryPrice,
        currentPrice
      ),
      lowWaterMark: current.lowWaterMark || entryPrice,
    };
  } else {
    return {
      highWaterMark: current.highWaterMark || entryPrice,
      lowWaterMark: Math.min(
        current.lowWaterMark || entryPrice,
        currentPrice
      ),
    };
  }
}
