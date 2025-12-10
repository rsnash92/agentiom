/**
 * Agent Executor
 * Runs the autonomous trading loop for an agent:
 * 1. Gather market data with technical analysis
 * 2. Analyze with LLM based on personality/strategy
 * 3. Calculate optimal position size
 * 4. Make trading decision with stop-loss/take-profit
 * 5. Execute trades with retry/circuit breaker protection
 * 6. Monitor positions with trailing stops
 */

import { db } from '@/lib/db';
import { agents, agentLogs, llmUsage, balanceSnapshots, positions } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { decryptPrivateKey } from '@/lib/crypto';
import { createServerTrader, hyperliquid } from '@/lib/hyperliquid';
import {
  getDemoAccountState,
  simulatePlaceOrder,
  simulateClosePosition,
  checkDemoStopLossTakeProfit,
} from './demo-simulator';
import {
  callLLM,
  selectModelForTask,
  AgentLLMConfig,
  DEFAULT_LLM_CONFIG,
  LLMResponse,
} from '@/lib/llm';
import {
  buildMarketAnalysisPrompt,
  buildTradingDecisionPrompt,
  buildPositionManagementPrompt,
  parseJsonResponse,
  validateTradingDecision,
  AgentContext,
  MarketContext as LLMMarketContext,
  PositionContext,
} from '@/lib/llm/prompts';
import type { Hex } from 'viem';

// New modules
import {
  calculatePositionSize,
  calculateTradeStatistics,
  PositionSizingConfig,
  PositionSizingStrategy,
} from './position-sizing';
import {
  calculateTrailingStop,
  updateWaterMarks,
  TrailingStopConfig,
  TrailingStopType,
} from './trailing-stop';
import {
  withResilience,
  getCircuitStatus,
} from './resilience';
import {
  calculateIndicators,
  calculateSupportResistance,
  formatIndicatorsForPrompt,
  type Candle,
} from './technical-analysis';
import {
  performRiskChecks,
  recordDecision,
  emergencyStopAgent,
  RiskConfig,
  DEFAULT_RISK_CONFIG,
} from './risk-management';
import {
  detectMarketRegime,
  formatRegimeForPrompt,
  type RegimeDetectionResult,
} from './market-regime';
import type { CandleData } from '@/lib/hyperliquid';

// Types
interface AgentConfig {
  id: string;
  userId: string;
  name: string;
  isDemo: boolean;
  demoBalance: number;
  personality: string;
  strategy: string;
  policies: {
    maxLeverage: number;
    maxPositionSizeUsd: number;
    maxPositionSizePct: number;
    maxDrawdownPct: number;
    approvedPairs: string[];
    // Confidence threshold (user-configurable, 30-90%)
    confidenceThreshold?: number;
    // Position sizing strategy (user-configurable)
    positionSizing?: {
      strategy: PositionSizingStrategy;
      maxRiskPerTrade?: number;
      kellyFraction?: number;
      volatilityMultiplier?: number;
    };
    // Trailing stop configuration (user-configurable)
    trailingStop?: {
      enabled: boolean;
      type: TrailingStopType;
      trailPercent?: number;
      atrMultiplier?: number;
      stepPercent?: number;
      stepGain?: number;
      breakevenTriggerPercent?: number;
    };
    // Risk limits (user-configurable)
    riskLimits?: {
      maxOpenPositions?: number;
      maxCorrelatedPositions?: number;
      decisionCooldownSeconds?: number;
    };
  };
  llmConfig: AgentLLMConfig;
  walletAddress: string;
  apiKeyEncrypted: string;
}

interface MarketData {
  coin: string;
  price: number;
  priceChange24h: number;
  funding: number;
  openInterest: number;
  volume24h: number;
  // Enhanced with technical analysis
  candles?: CandleData[];
  technicalIndicators?: ReturnType<typeof calculateIndicators>;
  supportResistance?: ReturnType<typeof calculateSupportResistance>;
  // Market regime detection
  regime?: RegimeDetectionResult;
}

interface TradingDecision {
  action: 'buy' | 'sell' | 'hold' | 'close';
  coin: string;
  confidence: number;
  size?: number;
  leverage?: number;
  reasoning: string;
  takeProfit?: number;
  stopLoss?: number;
}

interface ExecutionResult {
  success: boolean;
  decision: TradingDecision;
  executed: boolean;
  orderId?: string;
  error?: string;
  llmCost?: number;
}

/**
 * Execute one cycle of the agent's trading loop
 */
export async function executeAgentCycle(agentId: string): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  let totalLLMCost = 0;

  try {
    // 1. Get agent config
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.status, 'active')))
      .limit(1);

    if (!agent) {
      console.log(`Agent ${agentId} not found or not active`);
      return [];
    }

    const config: AgentConfig = {
      id: agent.id,
      userId: agent.userId,
      name: agent.name,
      isDemo: agent.isDemo,
      demoBalance: parseFloat(agent.demoBalance || '5000'),
      personality: agent.personality,
      strategy: agent.strategy,
      policies: agent.policies as AgentConfig['policies'],
      llmConfig: (agent.llmConfig as AgentLLMConfig) || DEFAULT_LLM_CONFIG,
      walletAddress: agent.walletAddress,
      apiKeyEncrypted: agent.apiKeyEncrypted,
    };

    const modeLabel = config.isDemo ? '[DEMO]' : '[LIVE]';
    await logAgentThinking(agentId, `${modeLabel} Starting analysis cycle...`);

    // 2. Get account state (different for demo vs live)
    let accountState: {
      accountValue: number;
      freeCollateral: number;
      positions: Array<{
        coin: string;
        side: 'long' | 'short';
        size: number;
        entryPrice: number;
        markPrice: number;
        unrealizedPnl: number;
        leverage: number;
      }>;
    };

    if (config.isDemo) {
      // Demo mode: use simulated account state
      const demoState = await getDemoAccountState(agentId);
      if (!demoState) {
        await logAgentError(agentId, 'Failed to fetch demo account state');
        return [];
      }
      accountState = {
        accountValue: demoState.accountValue,
        freeCollateral: demoState.freeCollateral,
        positions: demoState.positions,
      };

      // Check stop-loss and take-profit for demo positions
      await checkDemoStopLossTakeProfit(agentId);
    } else {
      // Live mode: use real Hyperliquid API
      const privateKey = decryptPrivateKey(config.apiKeyEncrypted) as Hex;
      const trader = createServerTrader(privateKey, process.env.HYPERLIQUID_NETWORK === 'testnet');
      const realState = await trader.getAccountState();
      if (!realState) {
        await logAgentError(agentId, 'Failed to fetch account state');
        return [];
      }
      accountState = realState;
    }

    await logAgentThinking(agentId,
      `${modeLabel} Account: $${accountState.accountValue.toFixed(2)} | ` +
      `Free: $${accountState.freeCollateral.toFixed(2)} | ` +
      `Positions: ${accountState.positions.length}`
    );

    // 4. Gather market data for approved pairs with technical analysis
    const marketData: MarketData[] = [];
    for (const coin of config.policies.approvedPairs) {
      // Use resilience wrapper for API calls
      const data = await withResilience(
        `hyperliquid.${coin}`,
        () => hyperliquid.getMarketData(coin),
        { retry: { maxRetries: 2 }, circuit: { failureThreshold: 3 } }
      ).catch(() => null);

      if (data) {
        const market: MarketData = {
          coin,
          price: data.markPx,
          priceChange24h: data.priceChangePct24h,
          funding: data.funding,
          openInterest: data.openInterest,
          volume24h: data.volume24h,
        };

        // Fetch candle data for technical analysis
        try {
          const candles = await withResilience(
            `hyperliquid.candles.${coin}`,
            () => hyperliquid.getCandles(coin, '1h', 100),
            { retry: { maxRetries: 1 } }
          ).catch(() => null);

          if (candles && candles.length > 0) {
            market.candles = candles;
            market.technicalIndicators = calculateIndicators(candles);
            market.supportResistance = calculateSupportResistance(candles);
          }
        } catch (candleError) {
          console.log(`Could not fetch candles for ${coin}:`, candleError);
        }

        // Detect market regime for this asset
        market.regime = detectMarketRegime({
          currentPrice: market.price,
          priceChange24h: market.priceChange24h,
          indicators: market.technicalIndicators,
          volume24h: market.volume24h,
        });

        marketData.push(market);
      }
    }

    // Log market regimes detected
    const regimeSummary = marketData
      .filter(m => m.regime)
      .map(m => `${m.coin}: ${m.regime!.regime}`)
      .join(', ');
    await logAgentThinking(agentId,
      `Analyzing ${marketData.length} markets: ${marketData.map(m => m.coin).join(', ')}`
    );
    if (regimeSummary) {
      await logAgentThinking(agentId, `Market regimes: ${regimeSummary}`);
    }

    // 4b. Check and update trailing stops for open positions (using agent's config)
    await checkAndUpdateTrailingStops(agentId, config, accountState.positions, marketData);

    // 5. Build agent context for LLM (includes recent trades from DB)
    const agentContext = await buildAgentContext(config, accountState);

    // 6. Use LLM for market analysis
    const analysisResult = await performMarketAnalysis(
      config,
      agentContext,
      marketData
    );
    totalLLMCost += analysisResult.cost;

    await logAgentThinking(agentId,
      `Market Analysis: ${analysisResult.sentiment} sentiment, ${analysisResult.volatility} volatility`
    );

    // 7. Analyze each market and make decisions
    for (const market of marketData) {
      const existingPosition = accountState.positions.find(p => p.coin === market.coin);

      // Use LLM to generate trading decision
      const decisionResult = await generateLLMDecision(
        config,
        agentContext,
        market,
        analysisResult.analysis,
        existingPosition
      );
      totalLLMCost += decisionResult.cost;

      const decision = decisionResult.decision;
      await logAgentDecision(agentId, decision, market);

      // 8. Execute if confidence is high enough (user-configurable, defaults: 50% demo, 70% live)
      const confidenceThreshold = config.policies.confidenceThreshold ?? (config.isDemo ? 50 : 70);
      if (decision.action !== 'hold' && decision.confidence >= confidenceThreshold) {
        // 8a. Perform risk checks before execution
        const riskConfig: Partial<RiskConfig> = {
          maxDrawdownPct: config.policies.maxDrawdownPct,
          initialBalance: config.isDemo ? 5000 : accountState.accountValue,
          maxOpenPositions: config.policies.riskLimits?.maxOpenPositions ?? DEFAULT_RISK_CONFIG.maxOpenPositions,
          maxCorrelatedPositions: config.policies.riskLimits?.maxCorrelatedPositions ?? DEFAULT_RISK_CONFIG.maxCorrelatedPositions,
          decisionCooldownMs: (config.policies.riskLimits?.decisionCooldownSeconds ?? 300) * 1000,
        };

        const riskCheck = await performRiskChecks(
          agentId,
          decision.action,
          market.coin,
          accountState.accountValue,
          riskConfig
        );

        // Log warnings
        for (const warning of riskCheck.warnings) {
          await logAgentThinking(agentId, `⚠️ Risk warning: ${warning}`);
        }

        // Check if we need to emergency stop
        if (riskCheck.shouldStopAgent) {
          await emergencyStopAgent(agentId, riskCheck.reasons.join('; '));
          await logAgentError(agentId, `🚨 EMERGENCY STOP: ${riskCheck.reasons.join('; ')}`);
          return results; // Stop execution immediately
        }

        // Check if trade is blocked by risk limits
        if (!riskCheck.allowed) {
          await logAgentThinking(agentId, `🚫 Trade blocked by risk limits: ${riskCheck.reasons.join('; ')}`);
          results.push({
            success: true,
            decision,
            executed: false,
            error: `Risk blocked: ${riskCheck.reasons.join('; ')}`,
            llmCost: totalLLMCost,
          });
          continue; // Skip to next market
        }

        let result: { success: boolean; orderId?: string; error?: string };

        if (config.isDemo) {
          // Demo mode: use simulator with position sizing
          result = await executeDemoDecision(agentId, config, decision, market, accountState);
        } else {
          // Live mode: use real trader
          const privateKey = decryptPrivateKey(config.apiKeyEncrypted) as Hex;
          const trader = createServerTrader(privateKey, process.env.HYPERLIQUID_NETWORK === 'testnet');
          result = await executeDecision(trader, config, decision, accountState);
        }

        // Record successful decision to prevent duplicates
        if (result.success && (decision.action === 'buy' || decision.action === 'sell')) {
          recordDecision(agentId, decision.action, market.coin);
        }

        results.push({
          success: result.success,
          decision,
          executed: true,
          orderId: result.orderId,
          error: result.error,
          llmCost: totalLLMCost,
        });

        if (result.success) {
          await logAgentExecution(agentId, decision, result);
        } else {
          await logAgentError(agentId, `Execution failed: ${result.error}`);
        }
      } else {
        results.push({
          success: true,
          decision,
          executed: false,
          llmCost: totalLLMCost,
        });
      }
    }

    await logAgentThinking(agentId,
      `Cycle complete. Made ${results.filter(r => r.executed).length} trades. LLM cost: $${totalLLMCost.toFixed(4)}`
    );

    // Save balance snapshot for performance chart
    try {
      const [currentAgent] = await db
        .select({ demoBalance: agents.demoBalance })
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);

      if (currentAgent) {
        const currentBalance = parseFloat(currentAgent.demoBalance || '5000');

        // Calculate unrealized P&L from open positions
        const openPositions = await db
          .select()
          .from(positions)
          .where(and(
            eq(positions.agentId, agentId),
            eq(positions.status, 'open')
          ));

        let unrealizedPnl = 0;
        for (const pos of openPositions) {
          unrealizedPnl += parseFloat(pos.unrealizedPnl || '0');
        }

        await db.insert(balanceSnapshots).values({
          agentId,
          balance: currentBalance.toString(),
          unrealizedPnl: unrealizedPnl.toString(),
        });
      }
    } catch (snapshotError) {
      console.error('Failed to save balance snapshot:', snapshotError);
    }

    return results;
  } catch (error) {
    console.error(`Agent ${agentId} execution error:`, error);
    await logAgentError(agentId, error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Build agent context from config and account state
 * Fetches recent trades from DB to include in LLM context
 */
async function buildAgentContext(
  config: AgentConfig,
  accountState: {
    accountValue: number;
    freeCollateral: number;
    positions: Array<{
      coin: string;
      side: 'long' | 'short';
      size: number;
      entryPrice: number;
      markPrice: number;
      unrealizedPnl: number;
      leverage: number;
    }>;
  }
): Promise<AgentContext> {
  // Fetch recent closed trades (last 24 hours, max 10)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentClosedTrades = await db
    .select({
      symbol: positions.symbol,
      side: positions.side,
      entryPrice: positions.entryPrice,
      size: positions.size,
      realizedPnl: positions.realizedPnl,
      closedAt: positions.closedAt,
    })
    .from(positions)
    .where(and(
      eq(positions.agentId, config.id),
      eq(positions.status, 'closed')
    ))
    .orderBy(desc(positions.closedAt))
    .limit(10);

  // Map to AgentContext format
  const recentTrades = recentClosedTrades
    .filter(t => t.closedAt && t.closedAt >= oneDayAgo)
    .map(t => ({
      coin: t.symbol,
      side: t.side === 'long' ? 'buy' as const : 'sell' as const,
      price: parseFloat(t.entryPrice),
      size: parseFloat(t.size),
      pnl: parseFloat(t.realizedPnl || '0'),
      timestamp: t.closedAt?.getTime() || Date.now(),
    }));

  return {
    name: config.name,
    strategy: config.strategy,
    riskParameters: {
      maxPositionSize: config.policies.maxPositionSizeUsd,
      maxLeverage: config.policies.maxLeverage,
      stopLossPercent: 3, // Default 3% stop loss
      takeProfitPercent: 5, // Default 5% take profit
      maxDailyLoss: config.policies.maxDrawdownPct * accountState.accountValue / 100,
    },
    accountBalance: accountState.accountValue,
    positions: accountState.positions.map(p => ({
      coin: p.coin,
      side: p.side,
      size: p.size,
      entryPrice: p.entryPrice,
      markPrice: p.markPrice,
      unrealizedPnl: p.unrealizedPnl,
      leverage: p.leverage,
    })),
    recentTrades,
  };
}

/**
 * Perform market analysis using LLM
 */
async function performMarketAnalysis(
  config: AgentConfig,
  agentContext: AgentContext,
  marketData: MarketData[]
): Promise<{
  sentiment: string;
  volatility: string;
  analysis: string;
  cost: number;
}> {
  const llmMarkets: LLMMarketContext[] = marketData.map(m => ({
    coin: m.coin,
    currentPrice: m.price,
    priceChange24h: m.priceChange24h,
    volume24h: m.volume24h,
    openInterest: m.openInterest,
    fundingRate: m.funding,
  }));

  const prompt = buildMarketAnalysisPrompt(agentContext, llmMarkets);

  // Select appropriate model based on config
  const modelId = config.llmConfig.autoSelect
    ? selectModelForTask('analysis', config.llmConfig)
    : config.llmConfig.analysisModel;

  try {
    const response = await callLLM({
      model: modelId,
      messages: [
        { role: 'user', content: prompt },
      ],
      parameters: config.llmConfig.parameters,
    });

    // Track LLM usage
    await trackLLMUsage(config.id, config.userId, response, 'analysis');

    // Parse response
    const parsed = parseJsonResponse<{
      analysis: {
        marketSentiment: string;
        volatility: string;
        keyObservations: string[];
        opportunities: Array<{
          coin: string;
          direction: string;
          confidence: number;
          reasoning: string;
        }>;
      };
    }>(response.content);

    if (parsed?.analysis) {
      return {
        sentiment: parsed.analysis.marketSentiment,
        volatility: parsed.analysis.volatility,
        analysis: JSON.stringify(parsed.analysis),
        cost: response.cost,
      };
    }

    // Fallback if parsing fails
    return {
      sentiment: 'neutral',
      volatility: 'medium',
      analysis: response.content,
      cost: response.cost,
    };
  } catch (error) {
    console.error('Market analysis LLM error:', error);
    return {
      sentiment: 'neutral',
      volatility: 'medium',
      analysis: 'Analysis failed - using fallback',
      cost: 0,
    };
  }
}

/**
 * Generate trading decision using LLM
 */
async function generateLLMDecision(
  config: AgentConfig,
  agentContext: AgentContext,
  market: MarketData,
  analysisContext: string,
  existingPosition?: {
    side: 'long' | 'short';
    size: number;
    entryPrice: number;
    markPrice: number;
    unrealizedPnl: number;
    leverage: number;
  }
): Promise<{ decision: TradingDecision; cost: number }> {
  const llmMarket: LLMMarketContext = {
    coin: market.coin,
    currentPrice: market.price,
    priceChange24h: market.priceChange24h,
    volume24h: market.volume24h,
    openInterest: market.openInterest,
    fundingRate: market.funding,
  };

  // Include market regime in prompt if available
  const promptOptions = market.regime
    ? { marketRegime: formatRegimeForPrompt(market.regime) }
    : undefined;

  const prompt = buildTradingDecisionPrompt(agentContext, llmMarket, analysisContext, promptOptions);

  // Select appropriate model
  const modelId = config.llmConfig.autoSelect
    ? selectModelForTask('complex', config.llmConfig)
    : config.llmConfig.primaryModel;

  try {
    const response = await callLLM({
      model: modelId,
      messages: [
        { role: 'user', content: prompt },
      ],
      parameters: config.llmConfig.parameters,
    });

    // Track LLM usage
    await trackLLMUsage(config.id, config.userId, response, 'decision');

    // Parse response
    const parsed = parseJsonResponse<{
      decision: {
        action: string;
        coin: string;
        size?: number;
        leverage?: number;
        orderType?: string;
        limitPrice?: number;
        stopLoss?: number;
        takeProfit?: number;
        confidence: number;
        reasoning: string;
        riskAssessment?: string;
      };
    }>(response.content);

    if (parsed?.decision) {
      // Map LLM action to our action types
      let action: TradingDecision['action'] = 'hold';
      if (parsed.decision.action === 'open_long') action = 'buy';
      else if (parsed.decision.action === 'open_short') action = 'sell';
      else if (parsed.decision.action === 'close_position') action = 'close';
      else if (parsed.decision.action === 'reduce_position') action = 'close';

      const decision: TradingDecision = {
        action,
        coin: parsed.decision.coin || market.coin,
        confidence: Math.round(parsed.decision.confidence * 100),
        size: parsed.decision.size ? parsed.decision.size / market.price : undefined,
        leverage: parsed.decision.leverage,
        reasoning: parsed.decision.reasoning,
        takeProfit: parsed.decision.takeProfit,
        stopLoss: parsed.decision.stopLoss,
      };

      // Validate decision against policies
      const validation = validateTradingDecision(
        {
          action: parsed.decision.action,
          size: parsed.decision.size,
          leverage: parsed.decision.leverage,
          stopLoss: parsed.decision.stopLoss,
        },
        agentContext
      );

      if (!validation.valid) {
        console.log(`Decision validation failed: ${validation.errors.join(', ')}`);
        decision.action = 'hold';
        decision.reasoning = `Policy violation: ${validation.errors.join(', ')}`;
      }

      return { decision, cost: response.cost };
    }

    // Fallback to hold if parsing fails
    return {
      decision: {
        action: 'hold',
        coin: market.coin,
        confidence: 50,
        reasoning: 'Failed to parse LLM response',
      },
      cost: response.cost,
    };
  } catch (error) {
    console.error('Decision LLM error:', error);
    // Fall back to rule-based decision
    return {
      decision: await generateRuleBasedDecision(config, market, existingPosition),
      cost: 0,
    };
  }
}

/**
 * Fallback rule-based decision when LLM fails
 */
async function generateRuleBasedDecision(
  config: AgentConfig,
  market: MarketData,
  existingPosition?: {
    side: 'long' | 'short';
    size: number;
    unrealizedPnl: number;
  }
): Promise<TradingDecision> {
  // Simple rule-based fallback
  if (existingPosition) {
    const pnlPct = (existingPosition.unrealizedPnl / (existingPosition.size * market.price)) * 100;

    if (pnlPct >= 5) {
      return {
        action: 'close',
        coin: market.coin,
        confidence: 85,
        reasoning: `Taking profit: ${pnlPct.toFixed(2)}% unrealized PnL (rule-based fallback)`,
      };
    }

    if (pnlPct <= -3) {
      return {
        action: 'close',
        coin: market.coin,
        confidence: 90,
        reasoning: `Stopping loss: ${pnlPct.toFixed(2)}% unrealized PnL (rule-based fallback)`,
      };
    }

    return {
      action: 'hold',
      coin: market.coin,
      confidence: 60,
      reasoning: `Holding existing position (rule-based fallback)`,
    };
  }

  // No position - check for entry signals
  if (market.priceChange24h > 3) {
    return {
      action: 'buy',
      coin: market.coin,
      confidence: 65,
      size: config.policies.maxPositionSizeUsd / market.price / 2,
      leverage: Math.min(config.policies.maxLeverage, 3),
      reasoning: `Strong momentum signal: ${market.priceChange24h.toFixed(2)}% (rule-based fallback)`,
    };
  }

  if (market.priceChange24h < -3) {
    return {
      action: 'sell',
      coin: market.coin,
      confidence: 65,
      size: config.policies.maxPositionSizeUsd / market.price / 2,
      leverage: Math.min(config.policies.maxLeverage, 3),
      reasoning: `Strong downward momentum: ${market.priceChange24h.toFixed(2)}% (rule-based fallback)`,
    };
  }

  return {
    action: 'hold',
    coin: market.coin,
    confidence: 50,
    reasoning: 'No clear signal (rule-based fallback)',
  };
}

/**
 * Track LLM usage for cost monitoring
 */
async function trackLLMUsage(
  agentId: string,
  userId: string,
  response: LLMResponse,
  taskType: string
) {
  try {
    await db.insert(llmUsage).values({
      agentId,
      userId,
      model: response.model,
      provider: response.provider,
      taskType,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      totalTokens: response.usage.totalTokens,
      costUsd: response.cost.toFixed(6),
      latencyMs: response.latencyMs,
      success: true,
    });
  } catch (error) {
    console.error('Failed to track LLM usage:', error);
  }
}

/**
 * Execute a demo trading decision using simulator
 * Uses agent's configured position sizing strategy
 */
async function executeDemoDecision(
  agentId: string,
  config: AgentConfig,
  decision: TradingDecision,
  market: MarketData,
  accountState: { accountValue: number; freeCollateral: number }
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    if (decision.action === 'close') {
      const result = await simulateClosePosition(agentId, decision.coin, decision.reasoning);
      return {
        success: result.success,
        orderId: result.orderId,
        error: result.error,
      };
    }

    if (decision.action === 'buy' || decision.action === 'sell') {
      // Calculate optimal position size using agent's configured strategy
      const positionSize = await calculateOptimalPositionSize(
        agentId,
        config,
        accountState,
        market,
        decision
      );

      await logAgentThinking(agentId,
        `[POSITION SIZING] ${positionSize.reasoning}`
      );

      const result = await simulatePlaceOrder(agentId, {
        coin: decision.coin,
        side: decision.action,
        size: positionSize.sizeAsset, // Use calculated size instead of default
        orderType: 'market',
        leverage: decision.leverage || Math.min(config.policies.maxLeverage, 3),
        takeProfit: decision.takeProfit,
        stopLoss: decision.stopLoss,
        reasoning: decision.reasoning,
      });

      return {
        success: result.success,
        orderId: result.orderId,
        error: result.error,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a trading decision (live mode)
 */
async function executeDecision(
  trader: ReturnType<typeof createServerTrader>,
  config: AgentConfig,
  decision: TradingDecision,
  accountState: { freeCollateral: number }
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    if (decision.action === 'close') {
      const result = await trader.closePosition(decision.coin);
      return {
        success: result.success,
        orderId: result.orderId,
        error: result.error,
      };
    }

    if (decision.action === 'buy' || decision.action === 'sell') {
      const result = await trader.placeOrder({
        coin: decision.coin,
        side: decision.action,
        size: decision.size!,
        orderType: 'market',
        leverage: decision.leverage,
      });

      return {
        success: result.success,
        orderId: result.orderId,
        error: result.error,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Logging helpers
async function logAgentThinking(agentId: string, content: string) {
  await db.insert(agentLogs).values({
    agentId,
    logType: 'thinking',
    content,
  });
}

async function logAgentDecision(agentId: string, decision: TradingDecision, market: MarketData) {
  await db.insert(agentLogs).values({
    agentId,
    logType: 'decision',
    symbol: decision.coin,
    content: `${decision.action.toUpperCase()} ${decision.coin} (${decision.confidence}% confidence): ${decision.reasoning}`,
    decision: {
      action: decision.action,
      symbol: decision.coin,
      confidence: decision.confidence,
      sizeUsd: (decision.size || 0) * market.price,
      leverage: decision.leverage || 1,
      takeProfit: decision.takeProfit,
      stopLoss: decision.stopLoss,
      reasoning: decision.reasoning,
      marketContext: `Price: $${market.price.toFixed(2)}, 24h: ${market.priceChange24h.toFixed(2)}%, Funding: ${(market.funding * 100).toFixed(3)}%`,
    },
    confidence: decision.confidence,
    marketData: market as unknown as Record<string, unknown>,
  });
}

async function logAgentExecution(
  agentId: string,
  decision: TradingDecision,
  result: { orderId?: string }
) {
  await db.insert(agentLogs).values({
    agentId,
    logType: 'execution',
    symbol: decision.coin,
    content: `Executed ${decision.action} ${decision.coin}${result.orderId ? ` (Order: ${result.orderId})` : ''}`,
  });
}

async function logAgentError(agentId: string, error: string) {
  await db.insert(agentLogs).values({
    agentId,
    logType: 'error',
    content: error,
  });
}

/**
 * Check and update trailing stops for open positions
 * Uses agent's configured trailing stop strategy from policies
 */
async function checkAndUpdateTrailingStops(
  agentId: string,
  config: AgentConfig,
  openPositions: Array<{
    coin: string;
    side: 'long' | 'short';
    size: number;
    entryPrice: number;
    markPrice: number;
    unrealizedPnl: number;
    leverage: number;
  }>,
  marketData: MarketData[]
): Promise<void> {
  // Check if trailing stops are enabled for this agent
  const trailingStopConfig = config.policies.trailingStop;
  if (!trailingStopConfig?.enabled) {
    return; // Trailing stops disabled, skip
  }
  for (const position of openPositions) {
    const market = marketData.find(m => m.coin === position.coin);
    if (!market) continue;

    const unrealizedPnlPercent = ((position.markPrice - position.entryPrice) / position.entryPrice) * 100 *
      (position.side === 'long' ? 1 : -1);

    // Get position from DB to access high/low water marks
    const [dbPosition] = await db
      .select()
      .from(positions)
      .where(and(
        eq(positions.agentId, agentId),
        eq(positions.symbol, position.coin),
        eq(positions.status, 'open')
      ))
      .limit(1);

    if (!dbPosition) continue;

    // Update water marks
    const waterMarks = updateWaterMarks(
      {
        highWaterMark: dbPosition.highWaterMark ? parseFloat(dbPosition.highWaterMark) : undefined,
        lowWaterMark: dbPosition.lowWaterMark ? parseFloat(dbPosition.lowWaterMark) : undefined,
      },
      position.side,
      market.price,
      position.entryPrice
    );

    // Calculate new trailing stop using agent's configured strategy
    const trailingResult = calculateTrailingStop(
      {
        side: position.side,
        entryPrice: position.entryPrice,
        currentPrice: market.price,
        currentStopLoss: dbPosition.stopLoss ? parseFloat(dbPosition.stopLoss) : undefined,
        highWaterMark: waterMarks.highWaterMark,
        lowWaterMark: waterMarks.lowWaterMark,
        atr: market.technicalIndicators?.atr14 || undefined,
        unrealizedPnlPercent,
      },
      {
        type: trailingStopConfig.type,
        trailPercent: trailingStopConfig.trailPercent ?? 2,
        atrMultiplier: trailingStopConfig.atrMultiplier ?? 2,
        stepPercent: trailingStopConfig.stepPercent ?? 1,
        stepGain: trailingStopConfig.stepGain ?? 2,
        breakevenTriggerPercent: trailingStopConfig.breakevenTriggerPercent ?? 2,
        lockProfitPercent: 5,
        lockProfitTrailPercent: 1,
      }
    );

    // Update position with new stop loss and water marks
    await db
      .update(positions)
      .set({
        stopLoss: trailingResult.newStopLoss.toString(),
        highWaterMark: waterMarks.highWaterMark.toString(),
        lowWaterMark: waterMarks.lowWaterMark.toString(),
      })
      .where(eq(positions.id, dbPosition.id));

    // If trailing stop triggered, close position
    if (trailingResult.triggered) {
      await logAgentThinking(agentId, `[TRAILING STOP] ${trailingResult.reason}`);
      await simulateClosePosition(agentId, position.coin, trailingResult.reason);
    } else if (trailingResult.profitLocked !== undefined && trailingResult.profitLocked > 0) {
      await logAgentThinking(agentId,
        `[TRAILING STOP] ${position.coin}: ${trailingResult.reason} (${trailingResult.profitLocked.toFixed(2)}% profit locked)`
      );
    }
  }
}

/**
 * Calculate position size using dynamic sizing strategies
 */
async function calculateOptimalPositionSize(
  agentId: string,
  config: AgentConfig,
  accountState: { accountValue: number; freeCollateral: number },
  market: MarketData,
  decision: TradingDecision
): Promise<{ sizeUsd: number; sizeAsset: number; reasoning: string }> {
  // Get historical trade stats for Kelly criterion
  const closedTrades = await db
    .select({
      realizedPnl: positions.realizedPnl,
      entryPrice: positions.entryPrice,
      size: positions.size,
    })
    .from(positions)
    .where(and(
      eq(positions.agentId, agentId),
      eq(positions.status, 'closed')
    ))
    .orderBy(desc(positions.closedAt))
    .limit(50);

  const trades = closedTrades.map(t => ({
    pnl: parseFloat(t.realizedPnl || '0'),
    pnlPercent: (parseFloat(t.realizedPnl || '0') / (parseFloat(t.size) * parseFloat(t.entryPrice))) * 100,
  }));

  const stats = calculateTradeStatistics(trades);

  // Get position sizing config from agent policies (user-configurable)
  const positionSizingConfig = config.policies.positionSizing;
  const strategy = positionSizingConfig?.strategy || 'fixed_fractional';

  // Calculate position size using agent's configured strategy
  const result = calculatePositionSize(
    {
      accountValue: accountState.accountValue,
      freeCollateral: accountState.freeCollateral,
      currentPrice: market.price,
      stopLossPercent: decision.stopLoss
        ? Math.abs((market.price - decision.stopLoss) / market.price * 100)
        : 3,
      volatility24h: Math.abs(market.priceChange24h),
      atr: market.technicalIndicators?.atr14 || undefined,
      winRate: stats.winRate,
      avgWinLossRatio: stats.avgWinLossRatio,
      confidence: decision.confidence,
      leverage: decision.leverage || 1,
      maxPositionSizeUsd: config.policies.maxPositionSizeUsd,
    },
    {
      strategy, // Use agent's configured strategy
      maxAccountPercent: config.policies.maxPositionSizePct,
      maxRiskPerTrade: positionSizingConfig?.maxRiskPerTrade ?? 100,
      kellyFraction: positionSizingConfig?.kellyFraction ?? 0.25,
      volatilityMultiplier: positionSizingConfig?.volatilityMultiplier ?? 1.5,
    }
  );

  return {
    sizeUsd: result.sizeUsd,
    sizeAsset: result.sizeAsset,
    reasoning: result.reasoning,
  };
}

/**
 * Get enhanced technical analysis summary for LLM prompt
 */
function getTechnicalAnalysisSummary(market: MarketData): string {
  if (!market.technicalIndicators) {
    return 'Technical analysis unavailable';
  }

  let summary = formatIndicatorsForPrompt(market.technicalIndicators);

  if (market.supportResistance) {
    const sr = market.supportResistance;
    if (sr.nearestSupport || sr.nearestResistance) {
      summary += '\n- Key Levels:';
      if (sr.nearestSupport) {
        summary += ` Support=$${sr.nearestSupport.toFixed(2)}`;
      }
      if (sr.nearestResistance) {
        summary += ` Resistance=$${sr.nearestResistance.toFixed(2)}`;
      }
    }
  }

  return summary;
}
