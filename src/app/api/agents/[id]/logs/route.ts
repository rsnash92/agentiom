import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users, agentLogs } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

// GET /api/agents/[id]/logs - Get agent logs
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify agent ownership
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Parse query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const logType = url.searchParams.get('type'); // 'thinking', 'decision', 'execution', 'error'

    // Build query
    let query = db
      .select()
      .from(agentLogs)
      .where(eq(agentLogs.agentId, id))
      .orderBy(desc(agentLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Filter by log type if specified
    if (logType) {
      query = db
        .select()
        .from(agentLogs)
        .where(and(eq(agentLogs.agentId, id), eq(agentLogs.logType, logType)))
        .orderBy(desc(agentLogs.createdAt))
        .limit(limit)
        .offset(offset);
    }

    const logs = await query;

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
