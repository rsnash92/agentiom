/**
 * Performance Statistics Calculator
 * Calculates comprehensive trading metrics for agents:
 * - Win Rate, Avg Win/Loss, Profit Factor
 * - Max Drawdown, Sharpe Ratio
 * - Total Trades, Best/Worst Trade
 */

export interface ClosedTrade {
  realizedPnl: number;
  entryPrice: number;
  size: number;
  sizeUsd: number;
  side: 'long' | 'short';
  openedAt: Date;
  closedAt: Date;
}

export interface BalanceSnapshot {
  balance: number;
  unrealizedPnl: number;
  timestamp: Date;
}

export interface PerformanceStats {
  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // 0-100%

  // P&L Metrics
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  avgWinLossRatio: number; // Avg Win / Avg Loss
  profitFactor: number; // Sum of wins / Sum of losses
  expectancy: number; // Expected value per trade

  // Best/Worst
  bestTrade: number;
  worstTrade: number;
  largestWin: number;
  largestLoss: number;

  // Drawdown
  maxDrawdown: number; // Absolute $
  maxDrawdownPct: number; // Percentage

  // Risk-Adjusted Returns
  sharpeRatio: number | null; // Annualized, null if not enough data

  // Streaks
  currentStreak: number; // Positive = wins, negative = losses
  longestWinStreak: number;
  longestLossStreak: number;

  // Time-based
  avgTradeDuration: number; // In hours
  tradesPerDay: number;
  firstTradeAt: Date | null;
  lastTradeAt: Date | null;
}

const EMPTY_STATS: PerformanceStats = {
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  winRate: 0,
  totalPnl: 0,
  avgWin: 0,
  avgLoss: 0,
  avgWinLossRatio: 0,
  profitFactor: 0,
  expectancy: 0,
  bestTrade: 0,
  worstTrade: 0,
  largestWin: 0,
  largestLoss: 0,
  maxDrawdown: 0,
  maxDrawdownPct: 0,
  sharpeRatio: null,
  currentStreak: 0,
  longestWinStreak: 0,
  longestLossStreak: 0,
  avgTradeDuration: 0,
  tradesPerDay: 0,
  firstTradeAt: null,
  lastTradeAt: null,
};

/**
 * Calculate comprehensive performance statistics from closed trades
 */
export function calculatePerformanceStats(
  trades: ClosedTrade[],
  snapshots: BalanceSnapshot[] = [],
  initialBalance: number = 5000
): PerformanceStats {
  if (trades.length === 0) {
    return EMPTY_STATS;
  }

  // Sort trades by close time
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime()
  );

  // Basic counts
  const winningTrades = sortedTrades.filter(t => t.realizedPnl > 0);
  const losingTrades = sortedTrades.filter(t => t.realizedPnl < 0);
  const breakEvenTrades = sortedTrades.filter(t => t.realizedPnl === 0);

  const totalTrades = sortedTrades.length;
  const winRate = (winningTrades.length / totalTrades) * 100;

  // P&L calculations
  const totalPnl = sortedTrades.reduce((sum, t) => sum + t.realizedPnl, 0);
  const totalWins = winningTrades.reduce((sum, t) => sum + t.realizedPnl, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.realizedPnl, 0));

  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  // Expectancy = (Win% × Avg Win) - (Loss% × Avg Loss)
  const winPct = winningTrades.length / totalTrades;
  const lossPct = losingTrades.length / totalTrades;
  const expectancy = (winPct * avgWin) - (lossPct * avgLoss);

  // Best/Worst trades
  const pnls = sortedTrades.map(t => t.realizedPnl);
  const bestTrade = Math.max(...pnls);
  const worstTrade = Math.min(...pnls);
  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.realizedPnl)) : 0;
  const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.realizedPnl)) : 0;

  // Calculate max drawdown
  const { maxDrawdown, maxDrawdownPct } = calculateMaxDrawdown(sortedTrades, snapshots, initialBalance);

  // Calculate Sharpe Ratio (if we have enough data)
  const sharpeRatio = calculateSharpeRatio(sortedTrades, snapshots, initialBalance);

  // Calculate streaks
  const { currentStreak, longestWinStreak, longestLossStreak } = calculateStreaks(sortedTrades);

  // Time-based metrics
  const firstTradeAt = sortedTrades[0].closedAt;
  const lastTradeAt = sortedTrades[sortedTrades.length - 1].closedAt;

  const totalDurationHours = sortedTrades.reduce((sum, t) => {
    const duration = new Date(t.closedAt).getTime() - new Date(t.openedAt).getTime();
    return sum + duration / (1000 * 60 * 60);
  }, 0);
  const avgTradeDuration = totalDurationHours / totalTrades;

  const tradingDays = (new Date(lastTradeAt).getTime() - new Date(firstTradeAt).getTime()) / (1000 * 60 * 60 * 24);
  const tradesPerDay = tradingDays > 0 ? totalTrades / tradingDays : totalTrades;

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: Math.round(winRate * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    avgWinLossRatio: avgWinLossRatio === Infinity ? 999 : Math.round(avgWinLossRatio * 100) / 100,
    profitFactor: profitFactor === Infinity ? 999 : Math.round(profitFactor * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    bestTrade: Math.round(bestTrade * 100) / 100,
    worstTrade: Math.round(worstTrade * 100) / 100,
    largestWin: Math.round(largestWin * 100) / 100,
    largestLoss: Math.round(largestLoss * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
    sharpeRatio: sharpeRatio !== null ? Math.round(sharpeRatio * 100) / 100 : null,
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    avgTradeDuration: Math.round(avgTradeDuration * 100) / 100,
    tradesPerDay: Math.round(tradesPerDay * 100) / 100,
    firstTradeAt: new Date(firstTradeAt),
    lastTradeAt: new Date(lastTradeAt),
  };
}

/**
 * Calculate maximum drawdown from equity curve
 */
function calculateMaxDrawdown(
  trades: ClosedTrade[],
  snapshots: BalanceSnapshot[],
  initialBalance: number
): { maxDrawdown: number; maxDrawdownPct: number } {
  // Build equity curve from trades
  let equity = initialBalance;
  let peak = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;

  // If we have snapshots, use those for more accurate drawdown
  if (snapshots.length > 0) {
    const sortedSnapshots = [...snapshots].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const snapshot of sortedSnapshots) {
      const totalEquity = snapshot.balance + snapshot.unrealizedPnl;
      if (totalEquity > peak) {
        peak = totalEquity;
      }
      const drawdown = peak - totalEquity;
      const drawdownPct = (drawdown / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPct = drawdownPct;
      }
    }
  } else {
    // Calculate from trades
    for (const trade of trades) {
      equity += trade.realizedPnl;
      if (equity > peak) {
        peak = equity;
      }
      const drawdown = peak - equity;
      const drawdownPct = (drawdown / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPct = drawdownPct;
      }
    }
  }

  return { maxDrawdown, maxDrawdownPct };
}

/**
 * Calculate Sharpe Ratio (risk-adjusted returns)
 * Uses daily returns if we have snapshots, otherwise uses per-trade returns
 */
function calculateSharpeRatio(
  trades: ClosedTrade[],
  snapshots: BalanceSnapshot[],
  initialBalance: number
): number | null {
  // Need at least 10 data points for meaningful Sharpe
  if (trades.length < 10 && snapshots.length < 10) {
    return null;
  }

  let returns: number[] = [];

  if (snapshots.length >= 10) {
    // Calculate daily returns from snapshots
    const sortedSnapshots = [...snapshots].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 1; i < sortedSnapshots.length; i++) {
      const prevEquity = sortedSnapshots[i - 1].balance + sortedSnapshots[i - 1].unrealizedPnl;
      const currEquity = sortedSnapshots[i].balance + sortedSnapshots[i].unrealizedPnl;
      if (prevEquity > 0) {
        returns.push((currEquity - prevEquity) / prevEquity);
      }
    }
  } else {
    // Calculate returns from trades
    let equity = initialBalance;
    for (const trade of trades) {
      const prevEquity = equity;
      equity += trade.realizedPnl;
      if (prevEquity > 0) {
        returns.push((equity - prevEquity) / prevEquity);
      }
    }
  }

  if (returns.length < 5) {
    return null;
  }

  // Calculate mean and std dev
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return null;
  }

  // Annualize (assuming ~365 trading days for crypto)
  // Sharpe = (mean return - risk-free rate) / std dev
  // Using 0% risk-free rate for simplicity
  const sharpe = (mean / stdDev) * Math.sqrt(365);

  return sharpe;
}

/**
 * Calculate win/loss streaks
 */
function calculateStreaks(trades: ClosedTrade[]): {
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
} {
  let currentStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let winStreak = 0;
  let lossStreak = 0;

  for (const trade of trades) {
    if (trade.realizedPnl > 0) {
      winStreak++;
      lossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, winStreak);
    } else if (trade.realizedPnl < 0) {
      lossStreak++;
      winStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, lossStreak);
    }
  }

  // Current streak (positive for wins, negative for losses)
  if (trades.length > 0) {
    const lastTrade = trades[trades.length - 1];
    if (lastTrade.realizedPnl > 0) {
      currentStreak = winStreak;
    } else if (lastTrade.realizedPnl < 0) {
      currentStreak = -lossStreak;
    }
  }

  return { currentStreak, longestWinStreak, longestLossStreak };
}

/**
 * Format a stat value for display
 */
export function formatStatValue(value: number | null, type: 'currency' | 'percent' | 'ratio' | 'number'): string {
  if (value === null) return 'N/A';

  switch (type) {
    case 'currency':
      return value >= 0 ? `$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'ratio':
      return value >= 999 ? '∞' : value.toFixed(2);
    case 'number':
      return value.toFixed(0);
    default:
      return value.toString();
  }
}
