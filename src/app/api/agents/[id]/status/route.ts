import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users, agentLogs } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  startAgentScheduler,
  stopAgentScheduler,
  isAgentSchedulerRunning,
} from '@/lib/agent/scheduler';

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

// GET /api/agents/[id]/status - Get agent status and recent logs
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify agent ownership
    const [agent] = await db
      .select({
        id: agents.id,
        status: agents.status,
        executionInterval: agents.executionInterval,
        lastExecutionAt: agents.lastExecutionAt,
      })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get recent logs
    const recentLogs = await db
      .select({
        id: agentLogs.id,
        logType: agentLogs.logType,
        content: agentLogs.content,
        symbol: agentLogs.symbol,
        confidence: agentLogs.confidence,
        createdAt: agentLogs.createdAt,
      })
      .from(agentLogs)
      .where(eq(agentLogs.agentId, id))
      .orderBy(desc(agentLogs.createdAt))
      .limit(20);

    return NextResponse.json({
      status: agent.status,
      schedulerRunning: isAgentSchedulerRunning(id),
      executionInterval: agent.executionInterval,
      lastExecutionAt: agent.lastExecutionAt,
      recentLogs,
    });
  } catch (error) {
    console.error('Agent status error:', error);
    return NextResponse.json(
      { error: 'Failed to get agent status' },
      { status: 500 }
    );
  }
}

// POST /api/agents/[id]/status - Start or stop agent
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body as { action: 'start' | 'stop' };

    if (!['start', 'stop'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Verify agent ownership and get current state
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (action === 'start') {
      // Verify agent has required config
      if (!agent.apiKeyEncrypted) {
        return NextResponse.json(
          { error: 'Agent wallet not configured' },
          { status: 400 }
        );
      }

      // Update status to active
      await db
        .update(agents)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(agents.id, id));

      // Start the scheduler
      startAgentScheduler(id, agent.executionInterval);

      return NextResponse.json({
        success: true,
        status: 'active',
        message: 'Agent started successfully',
      });
    } else {
      // Stop the scheduler
      stopAgentScheduler(id);

      // Update status to paused
      await db
        .update(agents)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(eq(agents.id, id));

      return NextResponse.json({
        success: true,
        status: 'paused',
        message: 'Agent stopped successfully',
      });
    }
  } catch (error) {
    console.error('Agent status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent status' },
      { status: 500 }
    );
  }
}
