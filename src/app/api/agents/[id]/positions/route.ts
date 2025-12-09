import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, positions } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { hyperliquid } from '@/lib/hyperliquid';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

async function verifyAgentOwnership(request: NextRequest, agentId: string) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const verifiedClaims = await privy.verifyAuthToken(token);
    const privyUser = await privy.getUser(verifiedClaims.userId);

    if (!privyUser.wallet?.address) return null;

    // Verify agent belongs to user
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) return null;

    // Get user by wallet
    const { users } = await import('@/lib/db/schema');
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, privyUser.wallet.address))
      .limit(1);

    if (!user || agent.userId !== user.id) return null;

    return { agent, user };
  } catch {
    return null;
  }
}

// GET /api/agents/[id]/positions - Get open and recent positions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const ownership = await verifyAgentOwnership(request, agentId);

    if (!ownership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent } = ownership;

    // Get open positions from database
    const openPositions = await db
      .select()
      .from(positions)
      .where(and(
        eq(positions.agentId, agentId),
        eq(positions.status, 'open')
      ))
      .orderBy(desc(positions.openedAt));

    // Update mark prices for open positions
    const updatedPositions = await Promise.all(
      openPositions.map(async (pos) => {
        const marketData = await hyperliquid.getMarketData(pos.symbol);
        const markPrice = marketData?.markPx || parseFloat(pos.markPrice || pos.entryPrice);
        const size = parseFloat(pos.size);
        const entryPrice = parseFloat(pos.entryPrice);

        // Calculate unrealized P&L
        const priceDiff = pos.side === 'long'
          ? markPrice - entryPrice
          : entryPrice - markPrice;
        const unrealizedPnl = priceDiff * size;
        const pnlPct = (priceDiff / entryPrice) * 100;

        return {
          id: pos.id,
          symbol: pos.symbol,
          side: pos.side.toUpperCase() as 'LONG' | 'SHORT',
          size: size,
          sizeUsd: parseFloat(pos.sizeUsd),
          entryPrice: entryPrice,
          markPrice: markPrice,
          liquidationPrice: pos.liquidationPrice ? parseFloat(pos.liquidationPrice) : null,
          leverage: parseFloat(pos.leverage),
          unrealizedPnl: unrealizedPnl,
          pnlPct: pnlPct,
          takeProfit: pos.takeProfit ? parseFloat(pos.takeProfit) : null,
          stopLoss: pos.stopLoss ? parseFloat(pos.stopLoss) : null,
          openedAt: pos.openedAt,
        };
      })
    );

    // Get recent closed positions
    const closedPositions = await db
      .select()
      .from(positions)
      .where(and(
        eq(positions.agentId, agentId),
        eq(positions.status, 'closed')
      ))
      .orderBy(desc(positions.closedAt))
      .limit(20);

    const formattedClosedPositions = closedPositions.map(pos => ({
      id: pos.id,
      symbol: pos.symbol,
      side: pos.side.toUpperCase() as 'LONG' | 'SHORT',
      size: parseFloat(pos.size),
      sizeUsd: parseFloat(pos.sizeUsd),
      entryPrice: parseFloat(pos.entryPrice),
      exitPrice: parseFloat(pos.markPrice || pos.entryPrice),
      leverage: parseFloat(pos.leverage),
      realizedPnl: parseFloat(pos.realizedPnl || '0'),
      openedAt: pos.openedAt,
      closedAt: pos.closedAt,
    }));

    return NextResponse.json({
      open: updatedPositions,
      closed: formattedClosedPositions,
      isDemo: agent.isDemo,
    });
  } catch (error) {
    console.error('Failed to fetch positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
