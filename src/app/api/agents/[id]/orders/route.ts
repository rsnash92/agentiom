import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, positions, agentLogs } from '@/lib/db/schema';
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

// GET /api/agents/[id]/orders - Get order history
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

    // Get recent execution logs (these represent orders)
    const orderLogs = await db
      .select()
      .from(agentLogs)
      .where(and(
        eq(agentLogs.agentId, agentId),
        eq(agentLogs.logType, 'execution')
      ))
      .orderBy(desc(agentLogs.createdAt))
      .limit(50);

    // Transform logs to order format
    const orders = orderLogs.map(log => {
      const decision = log.decision as {
        action?: string;
        symbol?: string;
        sizeUsd?: number;
        leverage?: number;
        reasoning?: string;
        marketContext?: string;
      } | null;

      // Parse the content to extract action and symbol
      const content = log.content || '';
      const isClose = content.includes('Closed');
      const isBuy = content.includes('long') || decision?.action === 'buy';

      return {
        id: log.id,
        agentId: log.agentId,
        action: isClose ? 'CLOSE' : (isBuy ? 'BUY' : 'SELL'),
        symbol: log.symbol || decision?.symbol || 'UNKNOWN',
        price: parseFloat(decision?.marketContext?.match(/\$([0-9,.]+)/)?.[1]?.replace(',', '') || '0'),
        quantity: decision?.sizeUsd ? decision.sizeUsd / parseFloat(decision?.marketContext?.match(/\$([0-9,.]+)/)?.[1]?.replace(',', '') || '1') : 0,
        filledAmount: decision?.sizeUsd || 0,
        leverage: decision?.leverage || 1,
        timestamp: log.createdAt,
        reasoning: decision?.reasoning || log.content,
      };
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
