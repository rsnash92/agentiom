/**
 * Risk Management Module
 *
 * Handles:
 * 1. Decision deduplication (cooldown period)
 * 2. Max concurrent positions limit
 * 3. Max drawdown emergency stop
 */

import { db } from '@/lib/db';
import { agents, agentLogs, positions } from '@/lib/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';

// ==================== Configuration ====================

export interface RiskConfig {
  // Decision deduplication
  decisionCooldownMs: number;  // Prevent same decision within this period (default: 5 min)

  // Position limits
  maxOpenPositions: number;    // Maximum concurrent positions (default: 5)
  maxCorrelatedPositions: number; // Max positions in correlated assets (default: 3)

  // Drawdown protection
  maxDrawdownPct: number;      // Emergency stop if drawdown exceeds (default: 20%)
  initialBalance: number;      // Starting balance for drawdown calculation
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  decisionCooldownMs: 5 * 60 * 1000, // 5 minutes
  maxOpenPositions: 5,
  maxCorrelatedPositions: 3,
  maxDrawdownPct: 20,
  initialBalance: 5000,
};

// ==================== Decision Deduplication ====================

interface RecentDecision {
  action: string;
  symbol: string;
  timestamp: Date;
}

// In-memory cache for recent decisions (per agent)
const recentDecisions = new Map<string, RecentDecision[]>();

/**
 * Check if a decision is a duplicate within the cooldown period
 */
export function isDuplicateDecision(
  agentId: string,
  action: string,
  symbol: string,
  cooldownMs: number = DEFAULT_RISK_CONFIG.decisionCooldownMs
): { isDuplicate: boolean; reason?: string } {
  const agentDecisions = recentDecisions.get(agentId) || [];
  const now = new Date();

  // Clean up old decisions
  const validDecisions = agentDecisions.filter(
    d => now.getTime() - d.timestamp.getTime() < cooldownMs
  );
  recentDecisions.set(agentId, validDecisions);

  // Check for duplicate
  const duplicate = validDecisions.find(
    d => d.action === action && d.symbol === symbol
  );

  if (duplicate) {
    const secondsAgo = Math.floor((now.getTime() - duplicate.timestamp.getTime()) / 1000);
    return {
      isDuplicate: true,
      reason: `Duplicate ${action} on ${symbol} - last decision ${secondsAgo}s ago (cooldown: ${cooldownMs / 1000}s)`,
    };
  }

  return { isDuplicate: false };
}

/**
 * Record a decision to prevent duplicates
 */
export function recordDecision(
  agentId: string,
  action: string,
  symbol: string
): void {
  const agentDecisions = recentDecisions.get(agentId) || [];
  agentDecisions.push({
    action,
    symbol,
    timestamp: new Date(),
  });
  recentDecisions.set(agentId, agentDecisions);
}

/**
 * Clear decision cache for an agent (useful for testing)
 */
export function clearDecisionCache(agentId: string): void {
  recentDecisions.delete(agentId);
}

// ==================== Position Limits ====================

// Correlated asset groups (positions in same group count together)
const CORRELATED_GROUPS: string[][] = [
  ['BTC'],           // Bitcoin standalone
  ['ETH', 'SOL', 'AVAX', 'MATIC'],  // Smart contract platforms
  ['DOGE', 'SHIB', 'PEPE'],         // Meme coins
  ['BNB'],           // Exchange tokens
  ['XRP', 'XLM'],    // Payment protocols
];

/**
 * Check if opening a new position would exceed limits
 */
export async function checkPositionLimits(
  agentId: string,
  symbol: string,
  maxOpenPositions: number = DEFAULT_RISK_CONFIG.maxOpenPositions,
  maxCorrelatedPositions: number = DEFAULT_RISK_CONFIG.maxCorrelatedPositions
): Promise<{ allowed: boolean; reason?: string }> {
  // Get current open positions
  const openPositions = await db
    .select({ symbol: positions.symbol })
    .from(positions)
    .where(and(
      eq(positions.agentId, agentId),
      eq(positions.status, 'open')
    ));

  const currentSymbols = openPositions.map(p => p.symbol);

  // Check 1: Max open positions
  if (currentSymbols.length >= maxOpenPositions) {
    return {
      allowed: false,
      reason: `Max open positions reached (${currentSymbols.length}/${maxOpenPositions})`,
    };
  }

  // Check 2: Already have this position
  if (currentSymbols.includes(symbol)) {
    // Allow - they might be adding to position or closing
    return { allowed: true };
  }

  // Check 3: Correlated positions
  const symbolGroup = CORRELATED_GROUPS.find(group => group.includes(symbol));
  if (symbolGroup) {
    const correlatedCount = currentSymbols.filter(s => symbolGroup.includes(s)).length;
    if (correlatedCount >= maxCorrelatedPositions) {
      return {
        allowed: false,
        reason: `Max correlated positions in group [${symbolGroup.join(', ')}] reached (${correlatedCount}/${maxCorrelatedPositions})`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Get count of open positions
 */
export async function getOpenPositionCount(agentId: string): Promise<number> {
  const result = await db
    .select({ symbol: positions.symbol })
    .from(positions)
    .where(and(
      eq(positions.agentId, agentId),
      eq(positions.status, 'open')
    ));

  return result.length;
}

// ==================== Drawdown Protection ====================

interface DrawdownState {
  peakBalance: number;
  lastChecked: Date;
}

// Track peak balance per agent
const peakBalances = new Map<string, DrawdownState>();

/**
 * Check if agent has exceeded max drawdown and should be stopped
 */
export async function checkDrawdownLimit(
  agentId: string,
  currentBalance: number,
  maxDrawdownPct: number = DEFAULT_RISK_CONFIG.maxDrawdownPct,
  initialBalance: number = DEFAULT_RISK_CONFIG.initialBalance
): Promise<{ exceeded: boolean; shouldStop: boolean; currentDrawdownPct: number; reason?: string }> {
  // Get or initialize peak balance
  let state = peakBalances.get(agentId);
  if (!state) {
    state = {
      peakBalance: Math.max(currentBalance, initialBalance),
      lastChecked: new Date(),
    };
    peakBalances.set(agentId, state);
  }

  // Update peak if we have a new high
  if (currentBalance > state.peakBalance) {
    state.peakBalance = currentBalance;
    state.lastChecked = new Date();
    peakBalances.set(agentId, state);
  }

  // Calculate current drawdown
  const drawdown = state.peakBalance - currentBalance;
  const drawdownPct = (drawdown / state.peakBalance) * 100;

  if (drawdownPct >= maxDrawdownPct) {
    return {
      exceeded: true,
      shouldStop: true,
      currentDrawdownPct: Math.round(drawdownPct * 100) / 100,
      reason: `Max drawdown exceeded: ${drawdownPct.toFixed(1)}% (limit: ${maxDrawdownPct}%). Peak: $${state.peakBalance.toFixed(2)}, Current: $${currentBalance.toFixed(2)}`,
    };
  }

  // Warning zone (80% of max drawdown)
  const warningThreshold = maxDrawdownPct * 0.8;
  if (drawdownPct >= warningThreshold) {
    return {
      exceeded: false,
      shouldStop: false,
      currentDrawdownPct: Math.round(drawdownPct * 100) / 100,
      reason: `Drawdown warning: ${drawdownPct.toFixed(1)}% (approaching limit: ${maxDrawdownPct}%)`,
    };
  }

  return {
    exceeded: false,
    shouldStop: false,
    currentDrawdownPct: Math.round(drawdownPct * 100) / 100,
  };
}

/**
 * Stop an agent due to risk limit breach
 */
export async function emergencyStopAgent(
  agentId: string,
  reason: string
): Promise<void> {
  console.log(`[EMERGENCY STOP] Agent ${agentId}: ${reason}`);

  // Update agent status to paused
  await db
    .update(agents)
    .set({
      status: 'paused',
      updatedAt: new Date(),
    })
    .where(eq(agents.id, agentId));

  // Log the emergency stop
  await db.insert(agentLogs).values({
    agentId,
    logType: 'error',
    content: `EMERGENCY STOP: ${reason}`,
  });
}

/**
 * Reset peak balance tracking (useful after manual intervention)
 */
export function resetPeakBalance(agentId: string, newPeak?: number): void {
  if (newPeak !== undefined) {
    peakBalances.set(agentId, {
      peakBalance: newPeak,
      lastChecked: new Date(),
    });
  } else {
    peakBalances.delete(agentId);
  }
}

// ==================== Combined Risk Check ====================

export interface RiskCheckResult {
  allowed: boolean;
  reasons: string[];
  warnings: string[];
  shouldStopAgent: boolean;
}

/**
 * Perform all risk checks before executing a trade
 */
export async function performRiskChecks(
  agentId: string,
  action: string,
  symbol: string,
  currentBalance: number,
  config: Partial<RiskConfig> = {}
): Promise<RiskCheckResult> {
  const fullConfig = { ...DEFAULT_RISK_CONFIG, ...config };
  const result: RiskCheckResult = {
    allowed: true,
    reasons: [],
    warnings: [],
    shouldStopAgent: false,
  };

  // 1. Check drawdown limit (most critical)
  const drawdownCheck = await checkDrawdownLimit(
    agentId,
    currentBalance,
    fullConfig.maxDrawdownPct,
    fullConfig.initialBalance
  );

  if (drawdownCheck.shouldStop) {
    result.allowed = false;
    result.shouldStopAgent = true;
    result.reasons.push(drawdownCheck.reason!);
    return result; // Don't continue if we need to stop
  }

  if (drawdownCheck.reason && !drawdownCheck.exceeded) {
    result.warnings.push(drawdownCheck.reason);
  }

  // 2. Check decision deduplication (only for opening positions)
  if (action === 'buy' || action === 'sell') {
    const dupeCheck = isDuplicateDecision(
      agentId,
      action,
      symbol,
      fullConfig.decisionCooldownMs
    );

    if (dupeCheck.isDuplicate) {
      result.allowed = false;
      result.reasons.push(dupeCheck.reason!);
    }
  }

  // 3. Check position limits (only for opening positions)
  if (action === 'buy' || action === 'sell') {
    const positionCheck = await checkPositionLimits(
      agentId,
      symbol,
      fullConfig.maxOpenPositions,
      fullConfig.maxCorrelatedPositions
    );

    if (!positionCheck.allowed) {
      result.allowed = false;
      result.reasons.push(positionCheck.reason!);
    }
  }

  return result;
}
