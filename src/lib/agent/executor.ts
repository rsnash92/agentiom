/**
 * Agent Executor
 * Runs the autonomous trading loop for an agent:
 * 1. Gather market data
 * 2. Analyze with LLM based on personality/strategy
 * 3. Make trading decision
 * 4. Execute trades within policy limits
 */

import { db } from '@/lib/db';
import { agents, agentLogs, llmUsage } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

    // 4. Gather market data for approved pairs
    const marketData: MarketData[] = [];
    for (const coin of config.policies.approvedPairs) {
      const data = await hyperliquid.getMarketData(coin);
      if (data) {
        marketData.push({
          coin,
          price: data.markPx,
          priceChange24h: data.priceChangePct24h,
          funding: data.funding,
          openInterest: data.openInterest,
          volume24h: data.volume24h,
        });
      }
    }

    await logAgentThinking(agentId,
      `Analyzing ${marketData.length} markets: ${marketData.map(m => m.coin).join(', ')}`
    );

    // 5. Build agent context for LLM
    const agentContext = buildAgentContext(config, accountState);

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

      // 8. Execute if confidence is high enough (50% for demo, 70% for live)
      const confidenceThreshold = config.isDemo ? 50 : 70;
      if (decision.action !== 'hold' && decision.confidence >= confidenceThreshold) {
        let result: { success: boolean; orderId?: string; error?: string };

        if (config.isDemo) {
          // Demo mode: use simulator
          result = await executeDemoDecision(agentId, config, decision, market);
        } else {
          // Live mode: use real trader
          const privateKey = decryptPrivateKey(config.apiKeyEncrypted) as Hex;
          const trader = createServerTrader(privateKey, process.env.HYPERLIQUID_NETWORK === 'testnet');
          result = await executeDecision(trader, config, decision, accountState);
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

    return results;
  } catch (error) {
    console.error(`Agent ${agentId} execution error:`, error);
    await logAgentError(agentId, error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Build agent context from config and account state
 */
function buildAgentContext(
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
): AgentContext {
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
    recentTrades: [], // Would need to fetch from DB
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

  const prompt = buildTradingDecisionPrompt(agentContext, llmMarket, analysisContext);

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
 */
async function executeDemoDecision(
  agentId: string,
  config: AgentConfig,
  decision: TradingDecision,
  market: MarketData
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
      const result = await simulatePlaceOrder(agentId, {
        coin: decision.coin,
        side: decision.action,
        size: decision.size || (config.policies.maxPositionSizeUsd / market.price / 2),
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
