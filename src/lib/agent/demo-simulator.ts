/**
 * Demo Trading Simulator
 * Simulates trading for demo agents without touching real APIs
 * - Uses real market data from Hyperliquid for prices
 * - Simulates order fills with realistic slippage
 * - Tracks positions and P&L in database
 * - Updates demo balance
 */

import { db } from '@/lib/db';
import { agents, positions, agentLogs } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { hyperliquid } from '@/lib/hyperliquid';

// Types
interface DemoAccountState {
  balance: number;
  freeCollateral: number;
  positions: DemoPosition[];
  accountValue: number;
}

interface DemoPosition {
  id: string;
  coin: string;
  side: 'long' | 'short';
  size: number;
  sizeUsd: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

interface DemoOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  filledPrice?: number;
  filledSize?: number;
}

interface DemoMarketData {
  coin: string;
  price: number;
  priceChange24h: number;
  funding: number;
  openInterest: number;
  volume24h: number;
}

/**
 * Get demo account state for an agent
 * Calculates balance, positions, and unrealized P&L
 */
export async function getDemoAccountState(agentId: string): Promise<DemoAccountState | null> {
  try {
    // Get agent's demo balance
    const [agent] = await db
      .select({ demoBalance: agents.demoBalance })
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) return null;

    const balance = parseFloat(agent.demoBalance || '5000');

    // Get open positions
    const openPositions = await db
      .select()
      .from(positions)
      .where(and(eq(positions.agentId, agentId), eq(positions.status, 'open')));

    // Fetch current prices and calculate unrealized P&L
    const demoPositions: DemoPosition[] = [];
    let totalUnrealizedPnl = 0;
    let totalMargin = 0;

    for (const pos of openPositions) {
      const marketData = await hyperliquid.getMarketData(pos.symbol);
      const markPrice = marketData?.markPx || parseFloat(pos.entryPrice);
      const size = parseFloat(pos.size);
      const entryPrice = parseFloat(pos.entryPrice);
      const sizeUsd = parseFloat(pos.sizeUsd);
      const leverage = parseFloat(pos.leverage);

      // Calculate unrealized P&L
      const priceDiff = pos.side === 'long'
        ? markPrice - entryPrice
        : entryPrice - markPrice;
      const unrealizedPnl = priceDiff * size;

      totalUnrealizedPnl += unrealizedPnl;
      totalMargin += sizeUsd / leverage;

      // Update position's mark price in DB
      await db
        .update(positions)
        .set({
          markPrice: markPrice.toString(),
          unrealizedPnl: unrealizedPnl.toString(),
        })
        .where(eq(positions.id, pos.id));

      demoPositions.push({
        id: pos.id,
        coin: pos.symbol,
        side: pos.side as 'long' | 'short',
        size,
        sizeUsd,
        entryPrice,
        markPrice,
        unrealizedPnl,
        leverage,
      });
    }

    const accountValue = balance + totalUnrealizedPnl;
    const freeCollateral = balance - totalMargin;

    return {
      balance,
      freeCollateral,
      positions: demoPositions,
      accountValue,
    };
  } catch (error) {
    console.error('Error getting demo account state:', error);
    return null;
  }
}

/**
 * Simulate placing an order for a demo agent
 * Creates a position in the database with simulated fill
 */
export async function simulatePlaceOrder(
  agentId: string,
  params: {
    coin: string;
    side: 'buy' | 'sell';
    size: number;
    orderType: 'market' | 'limit';
    leverage?: number;
    limitPrice?: number;
    takeProfit?: number;
    stopLoss?: number;
    reasoning?: string;
  }
): Promise<DemoOrderResult> {
  try {
    // Get current market price
    const marketData = await hyperliquid.getMarketData(params.coin);
    if (!marketData) {
      return { success: false, error: `Failed to get market data for ${params.coin}` };
    }

    // Simulate slippage (0.05% for market orders)
    const slippage = params.orderType === 'market' ? 0.0005 : 0;
    const fillPrice = params.side === 'buy'
      ? marketData.markPx * (1 + slippage)
      : marketData.markPx * (1 - slippage);

    const sizeUsd = params.size * fillPrice;
    const leverage = params.leverage || 1;

    // Check if agent has enough balance
    const accountState = await getDemoAccountState(agentId);
    if (!accountState) {
      return { success: false, error: 'Failed to get account state' };
    }

    const requiredMargin = sizeUsd / leverage;
    if (requiredMargin > accountState.freeCollateral) {
      return { success: false, error: `Insufficient margin. Required: $${requiredMargin.toFixed(2)}, Available: $${accountState.freeCollateral.toFixed(2)}` };
    }

    // Check for existing position in same coin
    const existingPosition = accountState.positions.find(p => p.coin === params.coin);

    if (existingPosition) {
      // For now, don't allow adding to positions - must close first
      return { success: false, error: `Already have open position in ${params.coin}. Close it first.` };
    }

    // Create position in database
    const orderId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const positionSide = params.side === 'buy' ? 'long' : 'short';

    await db.insert(positions).values({
      agentId,
      symbol: params.coin,
      side: positionSide,
      size: params.size.toString(),
      sizeUsd: sizeUsd.toString(),
      entryPrice: fillPrice.toString(),
      markPrice: fillPrice.toString(),
      leverage: leverage.toString(),
      unrealizedPnl: '0',
      realizedPnl: '0',
      takeProfit: params.takeProfit?.toString(),
      stopLoss: params.stopLoss?.toString(),
      status: 'open',
      entryReasoning: params.reasoning,
    });

    // Log the order
    await db.insert(agentLogs).values({
      agentId,
      logType: 'execution',
      symbol: params.coin,
      content: `[DEMO] Opened ${positionSide} position: ${params.size.toFixed(4)} ${params.coin} @ $${fillPrice.toFixed(2)} (${leverage}x leverage)`,
      decision: {
        action: params.side,
        symbol: params.coin,
        confidence: 100,
        sizeUsd,
        leverage,
        takeProfit: params.takeProfit,
        stopLoss: params.stopLoss,
        reasoning: params.reasoning || 'Demo order',
        marketContext: `Fill price: $${fillPrice.toFixed(2)}`,
      },
    });

    return {
      success: true,
      orderId,
      filledPrice: fillPrice,
      filledSize: params.size,
    };
  } catch (error) {
    console.error('Error simulating order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Simulate closing a position for a demo agent
 * Updates position to closed and adjusts demo balance
 */
export async function simulateClosePosition(
  agentId: string,
  coin: string,
  reasoning?: string
): Promise<DemoOrderResult> {
  try {
    // Find open position
    const [position] = await db
      .select()
      .from(positions)
      .where(and(
        eq(positions.agentId, agentId),
        eq(positions.symbol, coin),
        eq(positions.status, 'open')
      ))
      .limit(1);

    if (!position) {
      return { success: false, error: `No open position found for ${coin}` };
    }

    // Get current market price
    const marketData = await hyperliquid.getMarketData(coin);
    if (!marketData) {
      return { success: false, error: `Failed to get market data for ${coin}` };
    }

    // Simulate slippage (0.05%)
    const slippage = 0.0005;
    const exitPrice = position.side === 'long'
      ? marketData.markPx * (1 - slippage)
      : marketData.markPx * (1 + slippage);

    const size = parseFloat(position.size);
    const entryPrice = parseFloat(position.entryPrice);

    // Calculate realized P&L
    const priceDiff = position.side === 'long'
      ? exitPrice - entryPrice
      : entryPrice - exitPrice;
    const realizedPnl = priceDiff * size;

    // Update position to closed
    await db
      .update(positions)
      .set({
        status: 'closed',
        markPrice: exitPrice.toString(),
        realizedPnl: realizedPnl.toString(),
        unrealizedPnl: '0',
        exitReasoning: reasoning,
        closedAt: new Date(),
      })
      .where(eq(positions.id, position.id));

    // Update agent's demo balance
    await db
      .update(agents)
      .set({
        demoBalance: sql`CAST(${agents.demoBalance} AS NUMERIC) + ${realizedPnl}`,
      })
      .where(eq(agents.id, agentId));

    // Log the close
    const orderId = `demo_close_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.insert(agentLogs).values({
      agentId,
      logType: 'execution',
      symbol: coin,
      content: `[DEMO] Closed ${position.side} position: ${size.toFixed(4)} ${coin} @ $${exitPrice.toFixed(2)} | P&L: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(2)}`,
      decision: {
        action: 'close',
        symbol: coin,
        confidence: 100,
        sizeUsd: size * exitPrice,
        leverage: parseFloat(position.leverage),
        reasoning: reasoning || 'Demo close',
        marketContext: `Exit price: $${exitPrice.toFixed(2)}, P&L: $${realizedPnl.toFixed(2)}`,
      },
    });

    return {
      success: true,
      orderId,
      filledPrice: exitPrice,
      filledSize: size,
    };
  } catch (error) {
    console.error('Error closing position:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get market data for demo trading (real prices from Hyperliquid)
 */
export async function getDemoMarketData(coin: string): Promise<DemoMarketData | null> {
  const data = await hyperliquid.getMarketData(coin);
  if (!data) return null;

  return {
    coin,
    price: data.markPx,
    priceChange24h: data.priceChangePct24h,
    funding: data.funding,
    openInterest: data.openInterest,
    volume24h: data.volume24h,
  };
}

/**
 * Check stop-loss and take-profit for demo positions
 * Should be called periodically to simulate order execution
 */
export async function checkDemoStopLossTakeProfit(agentId: string): Promise<void> {
  try {
    // Get open positions with SL/TP
    const openPositions = await db
      .select()
      .from(positions)
      .where(and(eq(positions.agentId, agentId), eq(positions.status, 'open')));

    for (const position of openPositions) {
      if (!position.stopLoss && !position.takeProfit) continue;

      const marketData = await hyperliquid.getMarketData(position.symbol);
      if (!marketData) continue;

      const currentPrice = marketData.markPx;
      const stopLoss = position.stopLoss ? parseFloat(position.stopLoss) : null;
      const takeProfit = position.takeProfit ? parseFloat(position.takeProfit) : null;

      let shouldClose = false;
      let reason = '';

      if (position.side === 'long') {
        if (stopLoss && currentPrice <= stopLoss) {
          shouldClose = true;
          reason = `Stop-loss triggered at $${currentPrice.toFixed(2)} (SL: $${stopLoss.toFixed(2)})`;
        } else if (takeProfit && currentPrice >= takeProfit) {
          shouldClose = true;
          reason = `Take-profit triggered at $${currentPrice.toFixed(2)} (TP: $${takeProfit.toFixed(2)})`;
        }
      } else {
        if (stopLoss && currentPrice >= stopLoss) {
          shouldClose = true;
          reason = `Stop-loss triggered at $${currentPrice.toFixed(2)} (SL: $${stopLoss.toFixed(2)})`;
        } else if (takeProfit && currentPrice <= takeProfit) {
          shouldClose = true;
          reason = `Take-profit triggered at $${currentPrice.toFixed(2)} (TP: $${takeProfit.toFixed(2)})`;
        }
      }

      if (shouldClose) {
        await simulateClosePosition(agentId, position.symbol, reason);
      }
    }
  } catch (error) {
    console.error('Error checking SL/TP:', error);
  }
}
