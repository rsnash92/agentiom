/**
 * Zod Schemas for LLM Response Validation
 *
 * Type-safe validation for LLM responses to ensure
 * we handle malformed or unexpected outputs gracefully.
 */

import { z } from 'zod';

// ==================== Trading Decision Schema ====================

export const TradingDecisionSchema = z.object({
  decision: z.object({
    action: z.enum([
      'open_long',
      'open_short',
      'close_position',
      'add_to_position',
      'reduce_position',
      'hold',
      'no_action',
    ]),
    coin: z.string().min(1),
    size: z.number().positive().optional(),
    leverage: z.number().min(1).max(50).optional(),
    orderType: z.enum(['market', 'limit']).optional(),
    limitPrice: z.number().positive().optional(),
    stopLoss: z.number().positive().optional(),
    takeProfit: z.number().positive().optional(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().min(1),
    riskAssessment: z.enum(['low', 'medium', 'high']).optional(),
  }),
});

export type TradingDecisionResponse = z.infer<typeof TradingDecisionSchema>;

// ==================== Market Analysis Schema ====================

export const MarketAnalysisSchema = z.object({
  analysis: z.object({
    marketSentiment: z.enum(['bullish', 'bearish', 'neutral']),
    volatility: z.enum(['low', 'medium', 'high']),
    keyObservations: z.array(z.string()).optional(),
    opportunities: z.array(
      z.object({
        coin: z.string(),
        direction: z.enum(['long', 'short']),
        confidence: z.number().min(0).max(1),
        reasoning: z.string(),
      })
    ).optional(),
  }),
});

export type MarketAnalysisResponse = z.infer<typeof MarketAnalysisSchema>;

// ==================== Position Management Schema ====================

export const PositionManagementSchema = z.object({
  positionAction: z.object({
    action: z.enum(['hold', 'close', 'reduce', 'add', 'move_stop']),
    reason: z.string(),
    newStopLoss: z.number().positive().optional(),
    newTakeProfit: z.number().positive().optional(),
    reduceSize: z.number().positive().optional(),
    addSize: z.number().positive().optional(),
    urgency: z.enum(['low', 'medium', 'high']).optional(),
  }),
});

export type PositionManagementResponse = z.infer<typeof PositionManagementSchema>;

// ==================== Risk Assessment Schema ====================

export const RiskAssessmentSchema = z.object({
  riskAssessment: z.object({
    overallRisk: z.enum(['low', 'medium', 'high', 'critical']),
    concerns: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
    shouldReduceExposure: z.boolean(),
    positionsToClose: z.array(z.string()).optional(),
    reasoning: z.string(),
  }),
});

export type RiskAssessmentResponse = z.infer<typeof RiskAssessmentSchema>;

// ==================== Validation Functions ====================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  rawResponse?: string;
}

/**
 * Validate a trading decision response from LLM using Zod schema
 */
export function validateTradingDecisionSchema(
  parsed: unknown,
  rawResponse?: string
): ValidationResult<TradingDecisionResponse> {
  const result = TradingDecisionSchema.safeParse(parsed);

  if (!result.success) {
    const errorMessage = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    return {
      success: false,
      error: `Invalid trading decision: ${errorMessage}`,
      rawResponse,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate a market analysis response from LLM
 */
export function validateMarketAnalysis(
  parsed: unknown,
  rawResponse?: string
): ValidationResult<MarketAnalysisResponse> {
  const result = MarketAnalysisSchema.safeParse(parsed);

  if (!result.success) {
    const errorMessage = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    return {
      success: false,
      error: `Invalid market analysis: ${errorMessage}`,
      rawResponse,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate a position management response from LLM
 */
export function validatePositionManagement(
  parsed: unknown,
  rawResponse?: string
): ValidationResult<PositionManagementResponse> {
  const result = PositionManagementSchema.safeParse(parsed);

  if (!result.success) {
    const errorMessage = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    return {
      success: false,
      error: `Invalid position management: ${errorMessage}`,
      rawResponse,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate a risk assessment response from LLM
 */
export function validateRiskAssessment(
  parsed: unknown,
  rawResponse?: string
): ValidationResult<RiskAssessmentResponse> {
  const result = RiskAssessmentSchema.safeParse(parsed);

  if (!result.success) {
    const errorMessage = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    return {
      success: false,
      error: `Invalid risk assessment: ${errorMessage}`,
      rawResponse,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
