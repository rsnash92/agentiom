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

      // Build informative message
      const tradesExecuted = results.filter(r => r.executed).length;
      const totalMarkets = results.length;
      const decisions = results.map(r => ({
        coin: r.decision.coin,
        action: r.decision.action,
        confidence: r.decision.confidence,
        executed: r.executed,
        reasoning: r.decision.reasoning,
      }));

      let message: string;
      if (totalMarkets === 0) {
        message = 'No markets analyzed - check approved pairs';
      } else if (tradesExecuted > 0) {
        message = `Executed ${tradesExecuted} trade(s) across ${totalMarkets} market(s)`;
      } else {
        // All decisions were "hold" or below confidence threshold
        const holdCount = results.filter(r => r.decision.action === 'hold').length;
        const lowConfCount = results.filter(r => r.decision.action !== 'hold' && !r.executed).length;

        if (holdCount === totalMarkets) {
          message = `Analyzed ${totalMarkets} market(s) - holding (no clear signals)`;
        } else if (lowConfCount > 0) {
          message = `Analyzed ${totalMarkets} market(s) - signals below confidence threshold`;
        } else {
          message = `Analyzed ${totalMarkets} market(s) - no trades`;
        }
      }

      return NextResponse.json({
        success: true,
        results,
        decisions,
        tradesExecuted,
        totalMarkets,
        message,
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
