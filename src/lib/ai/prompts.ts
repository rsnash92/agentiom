import type { Agent, AgentContext, MarketData } from '@/types';
import { formatNumber } from '@/lib/utils';

/**
 * System prompt for the trading agent
 */
export const AGENT_SYSTEM_PROMPT = `You are an autonomous trading agent on Hyperliquid perpetual futures.

Your role is to analyze market conditions and make trading decisions based on your defined strategy and goals. You must always respect the risk policies provided.

You will receive:
1. Your personality and strategy definition
2. Current market data (price, funding, OI, technicals)
3. Your current positions
4. Your risk policies

You must respond with a JSON decision:
{
  "action": "OPEN_LONG" | "OPEN_SHORT" | "CLOSE" | "ADD" | "REDUCE" | "NO_ACTION",
  "symbol": "BTC" | "ETH" | etc,
  "confidence": 0-100,
  "sizeUsd": number,
  "leverage": number,
  "takeProfit": number | null,
  "stopLoss": number | null,
  "reasoning": "Your detailed analysis and reasoning",
  "marketContext": "Brief summary of current market conditions"
}

IMPORTANT:
- Never exceed policy limits
- Always provide clear reasoning
- Consider funding rates for position costs
- Factor in current positions before adding exposure
- NO_ACTION is valid when conditions don't meet your strategy
- Be conservative with confidence scores - only use 80+ when signals strongly align
- Always set stop losses to protect capital`;

/**
 * Build the decision prompt for the AI
 */
export function buildDecisionPrompt(context: AgentContext): string {
  const { agent, marketData, currentPosition, accountBalance, currentDrawdown } = context;

  return `
## Your Identity
${agent.personality}

## Your Strategy
${agent.strategy}

## Your Goals
${agent.goals.map((g) => `- ${g.description}`).join('\n')}

## Current Market Data for ${marketData.symbol}
- Price: $${formatNumber(marketData.price)}
- 24h Change: ${marketData.change24h.toFixed(2)}%
- RSI(14): ${marketData.rsi14.toFixed(1)}
- MACD: ${marketData.macd.histogram > 0 ? 'Bullish' : 'Bearish'} (Histogram: ${marketData.macd.histogram.toFixed(4)})
- Funding Rate: ${(marketData.fundingRate * 100).toFixed(4)}%
- Open Interest: $${formatNumber(marketData.openInterest)}
- 24h Volume: $${formatNumber(marketData.volume24h)}
- EMA20: $${formatNumber(marketData.ema20)}
- EMA50: $${formatNumber(marketData.ema50)}
- Spread: ${(marketData.spread * 100).toFixed(4)}%

## Your Current Position
${
  currentPosition
    ? `
- Side: ${currentPosition.side}
- Size: $${formatNumber(currentPosition.sizeUsd)}
- Entry: $${formatNumber(currentPosition.entryPrice)}
- Unrealized PnL: $${formatNumber(currentPosition.unrealizedPnl || 0)}
- Leverage: ${currentPosition.leverage}x
- Take Profit: ${currentPosition.takeProfit ? `$${formatNumber(currentPosition.takeProfit)}` : 'Not set'}
- Stop Loss: ${currentPosition.stopLoss ? `$${formatNumber(currentPosition.stopLoss)}` : 'Not set'}
`
    : 'No open position'
}

## Risk Policies
- Max Leverage: ${agent.policies.maxLeverage}x
- Max Position Size: $${formatNumber(agent.policies.maxPositionSizeUsd)}
- Max Position Size %: ${agent.policies.maxPositionSizePct}%
- Max Drawdown: ${agent.policies.maxDrawdownPct}%
- Approved Pairs: ${agent.policies.approvedPairs.join(', ')}

## Account Status
- Balance: $${formatNumber(accountBalance)}
- Current Drawdown: ${currentDrawdown.toFixed(2)}%
- Available for New Position: $${formatNumber(accountBalance * (agent.policies.maxPositionSizePct / 100))}

Analyze the market and provide your decision.`;
}

/**
 * Build a chat prompt for conversational interaction with the agent
 */
export function buildChatPrompt(
  agent: Agent,
  marketData: Record<string, MarketData>,
  userMessage: string
): string {
  const symbols = Object.keys(marketData);
  const marketSummary = symbols
    .map((symbol) => {
      const data = marketData[symbol];
      return `${symbol}: $${formatNumber(data.price)} (${data.change24h >= 0 ? '+' : ''}${data.change24h.toFixed(2)}%)`;
    })
    .join('\n');

  return `
## Your Identity
${agent.personality}

## Your Strategy
${agent.strategy}

## Current Market Overview
${marketSummary}

## User Message
${userMessage}

Respond to the user's message while staying in character. Provide helpful trading insights and analysis when relevant.`;
}

/**
 * Build an analysis prompt for one-click market analysis
 */
export function buildAnalysisPrompt(marketData: MarketData): string {
  return `
Provide a comprehensive technical analysis for ${marketData.symbol}.

## Current Market Data
- Price: $${formatNumber(marketData.price)}
- 24h Change: ${marketData.change24h.toFixed(2)}%
- 24h Volume: $${formatNumber(marketData.volume24h)}
- Open Interest: $${formatNumber(marketData.openInterest)}
- Funding Rate: ${(marketData.fundingRate * 100).toFixed(4)}%

## Technical Indicators
- RSI(14): ${marketData.rsi14.toFixed(1)}
- MACD: ${marketData.macd.macd.toFixed(4)} (Signal: ${marketData.macd.signal.toFixed(4)}, Histogram: ${marketData.macd.histogram.toFixed(4)})
- EMA20: $${formatNumber(marketData.ema20)}
- EMA50: $${formatNumber(marketData.ema50)}

## Orderbook
- Bid: $${formatNumber(marketData.bidPrice)}
- Ask: $${formatNumber(marketData.askPrice)}
- Spread: ${(marketData.spread * 100).toFixed(4)}%

## Liquidation Data
- Long Liquidations (24h): $${formatNumber(marketData.longLiquidations24h)}
- Short Liquidations (24h): $${formatNumber(marketData.shortLiquidations24h)}

Provide:
1. Overall market structure (bullish/bearish/neutral)
2. Key support and resistance levels
3. Technical indicator interpretation
4. Funding rate impact
5. Risk assessment
6. Potential trade setups with entry, TP, and SL levels`;
}
