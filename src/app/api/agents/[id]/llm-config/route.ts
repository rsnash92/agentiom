import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { AVAILABLE_MODELS, DEFAULT_LLM_CONFIG } from '@/lib/llm/types';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

const llmConfigSchema = z.object({
  primaryModel: z.string().refine(
    (id) => AVAILABLE_MODELS.some(m => m.id === id),
    'Invalid primary model'
  ),
  simpleModel: z.string().refine(
    (id) => AVAILABLE_MODELS.some(m => m.id === id),
    'Invalid simple model'
  ),
  analysisModel: z.string().refine(
    (id) => AVAILABLE_MODELS.some(m => m.id === id),
    'Invalid analysis model'
  ),
  autoSelect: z.boolean(),
  parameters: z.object({
    temperature: z.number().min(0).max(2),
    topP: z.number().min(0).max(1),
    frequencyPenalty: z.number().min(-2).max(2),
    presencePenalty: z.number().min(-2).max(2),
    maxTokens: z.number().min(256).max(32000),
  }),
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

// GET /api/agents/[id]/llm-config - Get agent LLM config
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent
    const [agent] = await db
      .select({ llmConfig: agents.llmConfig })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({
      llmConfig: agent.llmConfig || DEFAULT_LLM_CONFIG,
      availableModels: AVAILABLE_MODELS,
    });
  } catch (error) {
    console.error('Get LLM config error:', error);
    return NextResponse.json(
      { error: 'Failed to get LLM config' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id]/llm-config - Update agent LLM config
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = llmConfigSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid config', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const llmConfig = parseResult.data;

    // Update agent
    const [updated] = await db
      .update(agents)
      .set({
        llmConfig,
        updatedAt: new Date(),
      })
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .returning({ id: agents.id, llmConfig: agents.llmConfig });

    if (!updated) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ llmConfig: updated.llmConfig });
  } catch (error) {
    console.error('Update LLM config error:', error);
    return NextResponse.json(
      { error: 'Failed to update LLM config' },
      { status: 500 }
    );
  }
}
