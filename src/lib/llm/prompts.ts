// Trading-specific prompt templates for AI agents

export interface MarketContext {
  coin: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  openInterest?: number;
  fundingRate?: number;
  orderBook?: {
    bestBid: number;
    bestAsk: number;
    spread: number;
  };
  recentCandles?: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
  }>;
}

export interface PositionContext {
  coin: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice?: number;
}

export interface AgentContext {
  name: string;
  strategy: string;
  riskParameters: {
    maxPositionSize: number;
    maxLeverage: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    maxDailyLoss: number;
  };
  accountBalance: number;
  positions: PositionContext[];
  recentTrades: Array<{
    coin: string;
    side: 'buy' | 'sell';
    price: number;
    size: number;
    pnl?: number;
    timestamp: number;
  }>;
}

// Base system prompt for all trading decisions
export const TRADING_SYSTEM_PROMPT = `You are an autonomous cryptocurrency trading agent operating on Hyperliquid perpetual futures exchange.

Your core responsibilities:
1. Analyze market data and identify trading opportunities
2. Execute trades according to your configured strategy
3. Manage risk through position sizing and stop-losses
4. Monitor open positions and adjust as needed

Trading Rules:
- Never exceed configured risk parameters
- Always use stop-losses on new positions
- Consider funding rates for position holding costs
- Account for slippage in limit order pricing
- Avoid overtrading - quality over quantity

Response Format:
Always respond with valid JSON containing your analysis and decision.
Do not include any text outside the JSON structure.
`;

// Prompt for market analysis
export function buildMarketAnalysisPrompt(
  agent: AgentContext,
  markets: MarketContext[]
): string {
  return `${TRADING_SYSTEM_PROMPT}

Agent Configuration:
- Name: ${agent.name}
- Strategy: ${agent.strategy}
- Account Balance: $${agent.accountBalance.toFixed(2)}
- Max Position Size: $${agent.riskParameters.maxPositionSize}
- Max Leverage: ${agent.riskParameters.maxLeverage}x
- Stop Loss: ${agent.riskParameters.stopLossPercent}%
- Take Profit: ${agent.riskParameters.takeProfitPercent}%

Current Positions:
${agent.positions.length > 0
  ? agent.positions.map(p =>
      `- ${p.coin}: ${p.side} ${p.size} @ ${p.entryPrice}, PnL: $${p.unrealizedPnl.toFixed(2)}`
    ).join('\n')
  : '- No open positions'}

Market Data:
${markets.map(m => `
${m.coin}:
  Price: $${m.currentPrice.toFixed(2)} (${m.priceChange24h >= 0 ? '+' : ''}${m.priceChange24h.toFixed(2)}%)
  24h Volume: $${formatNumber(m.volume24h)}
  ${m.fundingRate !== undefined ? `Funding Rate: ${(m.fundingRate * 100).toFixed(4)}%` : ''}
  ${m.orderBook ? `Spread: ${(m.orderBook.spread * 100).toFixed(3)}%` : ''}
`).join('')}

Analyze the market conditions and respond with JSON:
{
  "analysis": {
    "marketSentiment": "bullish" | "bearish" | "neutral",
    "volatility": "low" | "medium" | "high",
    "keyObservations": ["observation1", "observation2"],
    "opportunities": [
      {
        "coin": "BTC",
        "direction": "long" | "short",
        "confidence": 0.0-1.0,
        "reasoning": "why this opportunity exists"
      }
    ]
  }
}`;
}

// Prompt for trading decision
export function buildTradingDecisionPrompt(
  agent: AgentContext,
  market: MarketContext,
  analysis: string
): string {
  return `${TRADING_SYSTEM_PROMPT}

Agent: ${agent.name}
Strategy: ${agent.strategy}
Account Balance: $${agent.accountBalance.toFixed(2)}

Risk Parameters:
- Max Position Size: $${agent.riskParameters.maxPositionSize}
- Max Leverage: ${agent.riskParameters.maxLeverage}x
- Stop Loss: ${agent.riskParameters.stopLossPercent}%
- Take Profit: ${agent.riskParameters.takeProfitPercent}%
- Max Daily Loss: $${agent.riskParameters.maxDailyLoss}

Current Position in ${market.coin}:
${agent.positions.find(p => p.coin === market.coin)
  ? (() => {
      const pos = agent.positions.find(p => p.coin === market.coin)!;
      return `- Side: ${pos.side}, Size: ${pos.size}, Entry: $${pos.entryPrice}, PnL: $${pos.unrealizedPnl.toFixed(2)}`;
    })()
  : '- No position'}

Market Data for ${market.coin}:
- Current Price: $${market.currentPrice.toFixed(2)}
- 24h Change: ${market.priceChange24h >= 0 ? '+' : ''}${market.priceChange24h.toFixed(2)}%
- 24h Volume: $${formatNumber(market.volume24h)}
${market.fundingRate !== undefined ? `- Funding Rate: ${(market.fundingRate * 100).toFixed(4)}%` : ''}
${market.orderBook ? `- Bid: $${market.orderBook.bestBid.toFixed(2)}, Ask: $${market.orderBook.bestAsk.toFixed(2)}` : ''}

Previous Analysis:
${analysis}

Based on this analysis, decide what action to take. Respond with JSON:
{
  "decision": {
    "action": "open_long" | "open_short" | "close_position" | "add_to_position" | "reduce_position" | "hold" | "no_action",
    "coin": "${market.coin}",
    "size": <position size in USD>,
    "leverage": <leverage to use, 1-${agent.riskParameters.maxLeverage}>,
    "orderType": "market" | "limit",
    "limitPrice": <price if limit order>,
    "stopLoss": <stop loss price>,
    "takeProfit": <take profit price>,
    "confidence": 0.0-1.0,
    "reasoning": "explanation of decision",
    "riskAssessment": "low" | "medium" | "high"
  }
}`;
}

// Prompt for position management
export function buildPositionManagementPrompt(
  agent: AgentContext,
  position: PositionContext,
  market: MarketContext
): string {
  const pnlPercent = ((position.markPrice - position.entryPrice) / position.entryPrice) * 100 * (position.side === 'long' ? 1 : -1);

  return `${TRADING_SYSTEM_PROMPT}

You are managing an existing position for agent "${agent.name}".

Position Details:
- Coin: ${position.coin}
- Side: ${position.side.toUpperCase()}
- Size: ${position.size} contracts
- Entry Price: $${position.entryPrice.toFixed(2)}
- Current Price: $${position.markPrice.toFixed(2)}
- Unrealized PnL: $${position.unrealizedPnl.toFixed(2)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
- Leverage: ${position.leverage}x
${position.liquidationPrice ? `- Liquidation Price: $${position.liquidationPrice.toFixed(2)}` : ''}

Risk Parameters:
- Stop Loss Target: ${agent.riskParameters.stopLossPercent}%
- Take Profit Target: ${agent.riskParameters.takeProfitPercent}%

Current Market:
- Price: $${market.currentPrice.toFixed(2)}
- 24h Change: ${market.priceChange24h >= 0 ? '+' : ''}${market.priceChange24h.toFixed(2)}%
${market.fundingRate !== undefined ? `- Funding Rate: ${(market.fundingRate * 100).toFixed(4)}%` : ''}

Evaluate this position and decide next steps. Respond with JSON:
{
  "positionAction": {
    "action": "hold" | "close" | "reduce" | "add" | "move_stop",
    "reason": "explanation",
    "newStopLoss": <new stop loss price if moving>,
    "newTakeProfit": <new take profit price if moving>,
    "reduceSize": <size to reduce if reducing>,
    "addSize": <size to add if adding>,
    "urgency": "low" | "medium" | "high"
  }
}`;
}

// Prompt for risk assessment
export function buildRiskAssessmentPrompt(
  agent: AgentContext
): string {
  const totalPnl = agent.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalExposure = agent.positions.reduce((sum, p) => sum + (p.size * p.markPrice), 0);

  return `${TRADING_SYSTEM_PROMPT}

Perform a risk assessment for agent "${agent.name}".

Account Status:
- Balance: $${agent.accountBalance.toFixed(2)}
- Total Unrealized PnL: $${totalPnl.toFixed(2)}
- Total Exposure: $${totalExposure.toFixed(2)}
- Exposure Ratio: ${((totalExposure / agent.accountBalance) * 100).toFixed(1)}%

Open Positions:
${agent.positions.length > 0
  ? agent.positions.map(p =>
      `- ${p.coin} ${p.side}: Size ${p.size}, Entry $${p.entryPrice.toFixed(2)}, PnL $${p.unrealizedPnl.toFixed(2)}, Leverage ${p.leverage}x`
    ).join('\n')
  : '- No open positions'}

Risk Limits:
- Max Position Size: $${agent.riskParameters.maxPositionSize}
- Max Leverage: ${agent.riskParameters.maxLeverage}x
- Max Daily Loss: $${agent.riskParameters.maxDailyLoss}

Recent Trades:
${agent.recentTrades.slice(0, 5).map(t =>
  `- ${new Date(t.timestamp).toISOString()}: ${t.side} ${t.coin} ${t.size} @ $${t.price.toFixed(2)}${t.pnl !== undefined ? ` (PnL: $${t.pnl.toFixed(2)})` : ''}`
).join('\n') || '- No recent trades'}

Assess the current risk status. Respond with JSON:
{
  "riskAssessment": {
    "overallRisk": "low" | "medium" | "high" | "critical",
    "concerns": ["concern1", "concern2"],
    "recommendations": ["recommendation1", "recommendation2"],
    "shouldReduceExposure": true | false,
    "positionsToClose": ["coin1", "coin2"],
    "reasoning": "detailed explanation"
  }
}`;
}

// Helper function to format large numbers
function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

// Parse JSON response from LLM, handling common issues
export function parseJsonResponse<T>(response: string): T | null {
  try {
    // Try direct parse first
    return JSON.parse(response);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Continue to next attempt
      }
    }

    // Try to find JSON object in response
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Give up
      }
    }

    return null;
  }
}

// Validate trading decision meets risk parameters
export function validateTradingDecision(
  decision: {
    action: string;
    size?: number;
    leverage?: number;
    stopLoss?: number;
  },
  agent: AgentContext
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (decision.size && decision.size > agent.riskParameters.maxPositionSize) {
    errors.push(`Position size $${decision.size} exceeds max $${agent.riskParameters.maxPositionSize}`);
  }

  if (decision.leverage && decision.leverage > agent.riskParameters.maxLeverage) {
    errors.push(`Leverage ${decision.leverage}x exceeds max ${agent.riskParameters.maxLeverage}x`);
  }

  if (['open_long', 'open_short'].includes(decision.action) && !decision.stopLoss) {
    errors.push('New positions must have a stop loss');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
