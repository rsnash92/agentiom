import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { executeAgentCycle } from '@/lib/agent/executor';

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

// POST /api/agents/[id]/execute - Manually trigger one execution cycle
export async function POST(request: NextRequest, context: RouteContext) {
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

    // Temporarily set to active for this cycle if paused
    const wasActive = agent.status === 'active';
    if (!wasActive) {
      await db
        .update(agents)
        .set({ status: 'active' })
        .where(eq(agents.id, id));
    }

    try {
      // Execute one cycle
      const results = await executeAgentCycle(id);

      return NextResponse.json({
        success: true,
        results,
        message: `Executed cycle with ${results.length} decisions`,
      });
    } finally {
      // Restore original status if it was paused
      if (!wasActive) {
        await db
          .update(agents)
          .set({ status: 'paused' })
          .where(eq(agents.id, id));
      }
    }
  } catch (error) {
    console.error('Agent execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute agent cycle' },
      { status: 500 }
    );
  }
}
