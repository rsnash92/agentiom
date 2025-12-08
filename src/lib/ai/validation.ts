import { z } from 'zod';
import type { Decision, AgentPolicies, PolicyCheck } from '@/types';

/**
 * Zod schema for validating AI decision output
 */
export const decisionSchema = z.object({
  action: z.enum(['OPEN_LONG', 'OPEN_SHORT', 'CLOSE', 'ADD', 'REDUCE', 'NO_ACTION']),
  symbol: z.string().min(1),
  confidence: z.number().min(0).max(100),
  sizeUsd: z.number().min(0),
  leverage: z.number().min(1).max(50),
  takeProfit: z.number().optional(),
  stopLoss: z.number().optional(),
  reasoning: z.string(),
  marketContext: z.string(),
});

/**
 * Validate AI output against schema and sanity checks
 */
export function validateAIOutput(output: unknown): Decision {
  // Schema validation
  const parsed = decisionSchema.safeParse(output);
  if (!parsed.success) {
    throw new Error(`Invalid AI output: ${parsed.error.message}`);
  }

  const decision = parsed.data;

  // Sanity checks
  if (decision.sizeUsd > 1000000) {
    throw new Error('Unreasonable position size (>$1M)');
  }

  // Validate TP/SL logic
  if (decision.takeProfit !== undefined && decision.stopLoss !== undefined) {
    if (decision.action === 'OPEN_LONG' && decision.takeProfit < decision.stopLoss) {
      throw new Error('Take profit below stop loss for long position');
    }
    if (decision.action === 'OPEN_SHORT' && decision.takeProfit > decision.stopLoss) {
      throw new Error('Take profit above stop loss for short position');
    }
  }

  return decision;
}

/**
 * Calculate current drawdown percentage
 */
export function calculateDrawdown(
  currentBalance: number,
  peakBalance: number
): number {
  if (peakBalance === 0) return 0;
  return ((peakBalance - currentBalance) / peakBalance) * 100;
}

/**
 * Validate a decision against agent policies
 */
export function validateDecision(
  decision: Decision,
  policies: AgentPolicies,
  accountBalance: number,
  currentDrawdown: number
): PolicyCheck {
  const violations: string[] = [];

  // Check leverage
  if (decision.leverage > policies.maxLeverage) {
    violations.push(
      `Leverage ${decision.leverage}x exceeds max ${policies.maxLeverage}x`
    );
  }

  // Check absolute position size
  if (decision.sizeUsd > policies.maxPositionSizeUsd) {
    violations.push(
      `Size $${decision.sizeUsd.toFixed(2)} exceeds max $${policies.maxPositionSizeUsd.toFixed(2)}`
    );
  }

  // Check percentage position size
  const maxSizeByPct = accountBalance * (policies.maxPositionSizePct / 100);
  if (decision.sizeUsd > maxSizeByPct) {
    violations.push(
      `Size $${decision.sizeUsd.toFixed(2)} exceeds ${policies.maxPositionSizePct}% of account ($${maxSizeByPct.toFixed(2)})`
    );
  }

  // Check approved pairs
  if (!policies.approvedPairs.includes(decision.symbol)) {
    violations.push(
      `${decision.symbol} not in approved pairs: ${policies.approvedPairs.join(', ')}`
    );
  }

  // Check drawdown
  if (currentDrawdown > policies.maxDrawdownPct) {
    violations.push(
      `Current drawdown ${currentDrawdown.toFixed(2)}% exceeds max ${policies.maxDrawdownPct}%`
    );
  }

  // Check trading hours if configured
  if (policies.tradingHours) {
    const currentHour = new Date().getUTCHours();
    const { start, end } = policies.tradingHours;

    const isInTradingHours =
      start <= end
        ? currentHour >= start && currentHour < end
        : currentHour >= start || currentHour < end;

    if (!isInTradingHours && decision.action !== 'NO_ACTION' && decision.action !== 'CLOSE') {
      violations.push(
        `Outside trading hours (${start}:00 - ${end}:00 UTC)`
      );
    }
  }

  // Generate adjusted decision if there are violations
  let adjustedDecision: Decision | undefined;
  if (violations.length > 0 && decision.action !== 'NO_ACTION') {
    // Try to adjust the decision to comply with policies
    adjustedDecision = { ...decision };

    // Adjust leverage
    if (decision.leverage > policies.maxLeverage) {
      adjustedDecision.leverage = policies.maxLeverage;
    }

    // Adjust position size
    const maxAllowedSize = Math.min(
      policies.maxPositionSizeUsd,
      maxSizeByPct
    );
    if (decision.sizeUsd > maxAllowedSize) {
      adjustedDecision.sizeUsd = maxAllowedSize;
    }

    // If symbol not approved or drawdown exceeded, cannot adjust
    if (
      !policies.approvedPairs.includes(decision.symbol) ||
      currentDrawdown > policies.maxDrawdownPct
    ) {
      adjustedDecision = undefined;
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    adjustedDecision,
  };
}

/**
 * Rate limiter for agent actions
 */
export class RateLimiter {
  private records: Map<string, { count: number; resetAt: number }> = new Map();

  check(agentId: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.records.get(agentId);

    if (!record || now > record.resetAt) {
      this.records.set(agentId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      return false;
    }

    record.count++;
    return true;
  }

  reset(agentId: string): void {
    this.records.delete(agentId);
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();
