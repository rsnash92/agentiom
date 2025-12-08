import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users, agentLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

const statusSchema = z.object({
  status: z.enum(['active', 'paused']),
});

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

// PATCH /api/agents/[id]/status - Update agent status (start/pause)
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    // Parse body
    const body = await request.json();
    const validationResult = statusSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status } = validationResult.data;

    // Update status
    const [updatedAgent] = await db
      .update(agents)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();

    // Log the status change
    await db.insert(agentLogs).values({
      agentId: id,
      logType: 'thinking',
      content: status === 'active'
        ? '🚀 Agent activated - starting autonomous trading'
        : '⏸️ Agent paused - trading stopped',
    });

    return NextResponse.json({
      agent: updatedAgent,
      message: status === 'active' ? 'Agent started' : 'Agent paused',
    });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent status' },
      { status: 500 }
    );
  }
}
