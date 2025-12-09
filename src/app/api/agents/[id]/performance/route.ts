import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, positions } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

// GET /api/agents/[id]/performance - Get performance history
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

    // Get initial balance
    const initialBalance = 5000;
    const currentBalance = parseFloat(agent.demoBalance || '5000');

    // Get closed positions to build performance history
    const closedPositions = await db
      .select()
      .from(positions)
      .where(and(
        eq(positions.agentId, agentId),
        eq(positions.status, 'closed')
      ))
      .orderBy(desc(positions.closedAt));

    // Build performance data points from closed positions
    const dataPoints: { timestamp: number; value: number }[] = [];

    // Start with initial balance at agent creation
    const agentCreatedAt = new Date(agent.createdAt).getTime();
    dataPoints.push({
      timestamp: agentCreatedAt,
      value: initialBalance,
    });

    // Add data points for each closed position
    let runningBalance = initialBalance;

    // Process positions in chronological order (oldest first)
    const sortedPositions = [...closedPositions].reverse();

    for (const pos of sortedPositions) {
      const realizedPnl = parseFloat(pos.realizedPnl || '0');
      runningBalance += realizedPnl;

      if (pos.closedAt) {
        dataPoints.push({
          timestamp: new Date(pos.closedAt).getTime(),
          value: runningBalance,
        });
      }
    }

    // Add current point
    dataPoints.push({
      timestamp: Date.now(),
      value: currentBalance,
    });

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

    // Calculate total P&L
    const totalPnl = currentBalance - initialBalance + unrealizedPnl;
    const pnlPct = (totalPnl / initialBalance) * 100;

    return NextResponse.json({
      initialBalance,
      currentBalance,
      unrealizedPnl,
      totalPnl,
      pnlPct,
      dataPoints,
      isDemo: agent.isDemo,
    });
  } catch (error) {
    console.error('Failed to fetch performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance' },
      { status: 500 }
    );
  }
}
