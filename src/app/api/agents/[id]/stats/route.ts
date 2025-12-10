import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, positions, balanceSnapshots, users } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { calculatePerformanceStats, type ClosedTrade, type BalanceSnapshot } from '@/lib/agent/performance-stats';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const verifiedClaims = await privy.verifyAuthToken(token);
    const privyUser = await privy.getUser(verifiedClaims.userId);

    if (!privyUser.wallet?.address) return null;

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, privyUser.wallet.address))
      .limit(1);

    return dbUser || null;
  } catch (error) {
    console.error('getUserFromToken error:', error);
    return null;
  }
}

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/agents/[id]/stats - Get comprehensive performance statistics
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get closed positions
    const closedPositions = await db
      .select()
      .from(positions)
      .where(and(
        eq(positions.agentId, id),
        eq(positions.status, 'closed')
      ))
      .orderBy(asc(positions.closedAt));

    // Get balance snapshots
    const snapshots = await db
      .select()
      .from(balanceSnapshots)
      .where(eq(balanceSnapshots.agentId, id))
      .orderBy(asc(balanceSnapshots.timestamp));

    // Convert to the format expected by calculatePerformanceStats
    const trades: ClosedTrade[] = closedPositions.map(pos => ({
      realizedPnl: parseFloat(pos.realizedPnl || '0'),
      entryPrice: parseFloat(pos.entryPrice),
      size: parseFloat(pos.size),
      sizeUsd: parseFloat(pos.sizeUsd),
      side: pos.side as 'long' | 'short',
      openedAt: new Date(pos.openedAt),
      closedAt: pos.closedAt ? new Date(pos.closedAt) : new Date(),
    }));

    const balanceSnaps: BalanceSnapshot[] = snapshots.map(snap => ({
      balance: parseFloat(snap.balance),
      unrealizedPnl: parseFloat(snap.unrealizedPnl || '0'),
      timestamp: new Date(snap.timestamp),
    }));

    const initialBalance = 5000; // Default demo starting balance

    // Calculate stats
    const stats = calculatePerformanceStats(trades, balanceSnaps, initialBalance);

    // Get open positions count
    const openPositions = await db
      .select()
      .from(positions)
      .where(and(
        eq(positions.agentId, id),
        eq(positions.status, 'open')
      ));

    // Calculate current equity
    const currentBalance = parseFloat(agent.demoBalance || '5000');
    const unrealizedPnl = openPositions.reduce(
      (sum, pos) => sum + parseFloat(pos.unrealizedPnl || '0'),
      0
    );
    const currentEquity = currentBalance + unrealizedPnl;
    const totalReturn = ((currentEquity - initialBalance) / initialBalance) * 100;

    return NextResponse.json({
      stats,
      summary: {
        currentBalance,
        unrealizedPnl,
        currentEquity,
        initialBalance,
        totalReturn: Math.round(totalReturn * 100) / 100,
        openPositions: openPositions.length,
        isDemo: agent.isDemo,
        status: agent.status,
      },
    });
  } catch (error) {
    console.error('Get agent stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get agent stats' },
      { status: 500 }
    );
  }
}
