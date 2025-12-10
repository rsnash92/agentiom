import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

// Validation schema for updating an agent
const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  personality: z.string().min(1).optional(),
  strategy: z.string().min(1).optional(),
  policies: z.object({
    maxLeverage: z.number().min(1).max(50),
    maxPositionSizeUsd: z.number().min(0),
    maxPositionSizePct: z.number().min(0).max(100),
    maxDrawdownPct: z.number().min(0).max(100),
    approvedPairs: z.array(z.string()),
  }).optional(),
  llmProvider: z.enum(['claude', 'openai', 'deepseek']).optional(),
  executionIntervalSeconds: z.number().min(60).max(86400).optional(),
  status: z.enum(['active', 'paused']).optional(),
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

    // Get database user
    let [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, privyUser.wallet.address))
      .limit(1);

    // Auto-create user if not exists (sync on first API call)
    if (!dbUser) {
      const [newUser] = await db
        .insert(users)
        .values({
          walletAddress: privyUser.wallet.address,
        })
        .onConflictDoUpdate({
          target: users.walletAddress,
          set: {
            updatedAt: new Date(),
          },
        })
        .returning();
      dbUser = newUser;
    }

    return dbUser || null;
  } catch (error) {
    console.error('getUserFromToken error:', error);
    return null;
  }
}

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/agents/[id] - Get a specific agent
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

// PUT /api/agents/[id] - Update an agent
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check agent exists and belongs to user
    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = updateAgentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { executionIntervalSeconds, ...restData } = validationResult.data;

    const [updatedAgent] = await db
      .update(agents)
      .set({
        ...restData,
        ...(executionIntervalSeconds !== undefined && { executionInterval: executionIntervalSeconds }),
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();

    return NextResponse.json({ agent: updatedAgent });
  } catch (error) {
    console.error('Failed to update agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[id] - Delete an agent
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check agent exists and belongs to user
    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Don't allow deletion of active agents
    if (existingAgent.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete an active agent. Please pause it first.' },
        { status: 400 }
      );
    }

    await db.delete(agents).where(eq(agents.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
