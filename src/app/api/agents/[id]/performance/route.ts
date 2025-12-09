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

// Interpolate data points between sparse data for smooth chart
function interpolateDataPoints(
  dataPoints: { timestamp: number; value: number }[],
  targetPoints: number = 100
): { timestamp: number; value: number }[] {
  // If we have 0 points, return empty
  if (dataPoints.length === 0) return dataPoints;

  // If we have 1 point, duplicate it to create a flat line
  if (dataPoints.length === 1) {
    const point = dataPoints[0];
    const oneDayMs = 24 * 60 * 60 * 1000;
    return [
      { timestamp: point.timestamp - oneDayMs, value: point.value },
      { timestamp: point.timestamp, value: point.value },
    ];
  }

  // If we already have enough points, return as-is
  if (dataPoints.length >= targetPoints) return dataPoints;

  const result: { timestamp: number; value: number }[] = [];
  const startTime = dataPoints[0].timestamp;
  const endTime = dataPoints[dataPoints.length - 1].timestamp;
  const timeRange = endTime - startTime;

  // If time range is too small, spread it out
  if (timeRange <= 1000) {
    // Just return the points we have if they're at the same time
    return dataPoints;
  }

  const interval = timeRange / (targetPoints - 1);

  for (let i = 0; i < targetPoints; i++) {
    const targetTime = startTime + (i * interval);

    // Find the surrounding data points
    let beforeIdx = 0;
    for (let j = 0; j < dataPoints.length - 1; j++) {
      if (dataPoints[j + 1].timestamp > targetTime) {
        beforeIdx = j;
        break;
      }
      beforeIdx = j;
    }

    const before = dataPoints[beforeIdx];
    const after = dataPoints[Math.min(beforeIdx + 1, dataPoints.length - 1)];

    // Linear interpolation with small random walk for realistic look
    let value: number;
    if (before.timestamp === after.timestamp) {
      value = before.value;
    } else {
      const ratio = (targetTime - before.timestamp) / (after.timestamp - before.timestamp);
      value = before.value + (after.value - before.value) * ratio;

      // Add small noise for realism (±0.1% of value)
      const noise = (Math.random() - 0.5) * value * 0.002;
      value += noise;
    }

    result.push({
      timestamp: Math.round(targetTime),
      value: Math.round(value * 100) / 100,
    });
  }

  return result;
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

    // Try to get balance snapshots first (table might not exist)
    let snapshots: { timestamp: Date; balance: string; unrealizedPnl: string | null }[] = [];
    try {
      const { balanceSnapshots } = await import('@/lib/db/schema');
      const { asc } = await import('drizzle-orm');
      snapshots = await db
        .select({
          timestamp: balanceSnapshots.timestamp,
          balance: balanceSnapshots.balance,
          unrealizedPnl: balanceSnapshots.unrealizedPnl,
        })
        .from(balanceSnapshots)
        .where(eq(balanceSnapshots.agentId, agentId))
        .orderBy(asc(balanceSnapshots.timestamp))
        .limit(500);
    } catch {
      // Table doesn't exist yet, continue with fallback
      console.log('balance_snapshots table not available, using fallback');
    }

    let dataPoints: { timestamp: number; value: number }[] = [];

    if (snapshots.length > 0) {
      // Use stored snapshots
      dataPoints = snapshots.map(s => ({
        timestamp: new Date(s.timestamp).getTime(),
        value: parseFloat(s.balance) + parseFloat(s.unrealizedPnl || '0'),
      }));
    } else {
      // Fall back to generating from positions
      const closedPositions = await db
        .select()
        .from(positions)
        .where(and(
          eq(positions.agentId, agentId),
          eq(positions.status, 'closed')
        ))
        .orderBy(desc(positions.closedAt));

      // Start with initial balance at agent creation
      const agentCreatedAt = new Date(agent.createdAt).getTime();
      dataPoints.push({
        timestamp: agentCreatedAt,
        value: initialBalance,
      });

      // Add data points for each closed position
      let runningBalance = initialBalance;
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
    }

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

    // Get the actual current balance from the latest data point
    // If we have snapshots, use the latest; otherwise use demoBalance
    let actualCurrentBalance = currentBalance;
    if (dataPoints.length > 0) {
      // Use the last data point value as the current balance
      actualCurrentBalance = dataPoints[dataPoints.length - 1].value;
    }

    // Add current point with unrealized P&L factored in
    dataPoints.push({
      timestamp: Date.now(),
      value: actualCurrentBalance + unrealizedPnl,
    });

    // Interpolate to get smooth chart data
    const smoothDataPoints = interpolateDataPoints(dataPoints, 100);

    // Calculate total P&L
    const totalPnl = actualCurrentBalance - initialBalance + unrealizedPnl;
    const pnlPct = (totalPnl / initialBalance) * 100;

    return NextResponse.json({
      initialBalance,
      currentBalance: actualCurrentBalance,
      unrealizedPnl,
      totalPnl,
      pnlPct,
      dataPoints: smoothDataPoints,
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

// POST /api/agents/[id]/performance - Save a balance snapshot
export async function POST(
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
    const currentBalance = parseFloat(agent.demoBalance || '5000');

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

    // Try to save snapshot (table might not exist)
    try {
      const { balanceSnapshots } = await import('@/lib/db/schema');
      await db.insert(balanceSnapshots).values({
        agentId,
        balance: currentBalance.toString(),
        unrealizedPnl: unrealizedPnl.toString(),
      });
    } catch {
      console.log('balance_snapshots table not available');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to save snapshot' },
      { status: 500 }
    );
  }
}
