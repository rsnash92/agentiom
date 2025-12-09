import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users, inviteCodes } from '@/lib/db/schema';
import { eq, and, gt, or, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { generateAgentWallet } from '@/lib/crypto';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

// Validation schema for creating an agent
const createAgentSchema = z.object({
  name: z.string().min(1).max(20),
  prompt: z.string().max(1000).optional(), // Combined personality/strategy prompt
  personality: z.string().optional(), // Legacy support
  strategy: z.string().optional(), // Legacy support
  isDemo: z.boolean().default(true),
  inviteCode: z.string().optional(), // Required for live trading
  model: z.string().default('deepseek-chat'),
  approvedPairs: z.array(z.string()).default(['BTC', 'ETH', 'SOL']),
  policies: z.object({
    maxLeverage: z.number().min(1).max(50).default(10),
    maxPositionSizeUsd: z.number().min(0).default(1000),
    maxPositionSizePct: z.number().min(0).max(100).default(10),
    maxDrawdownPct: z.number().min(0).max(100).default(20),
    approvedPairs: z.array(z.string()).default(['BTC', 'ETH']),
  }).optional(),
  executionIntervalSeconds: z.number().min(60).max(86400).default(300),
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

// GET /api/agents - List user's agents
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.userId, user.id));

    return NextResponse.json({ agents: userAgents });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = createAgentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Skip invite code validation in development or when disabled via env var
    const skipInviteValidation = process.env.NODE_ENV === 'development' || process.env.SKIP_INVITE_VALIDATION === 'true';
    let validatedInviteCode: string | null = null;

    if (!skipInviteValidation) {
      // Invite code is required for both demo and live trading
      if (!data.inviteCode) {
        return NextResponse.json(
          { error: 'Invite code required' },
          { status: 400 }
        );
      }

      const normalizedCode = data.inviteCode.trim().toUpperCase();

      // Validate and use invite code
      const [inviteCode] = await db
        .select()
        .from(inviteCodes)
        .where(
          and(
            eq(inviteCodes.code, normalizedCode),
            eq(inviteCodes.isActive, true),
            or(
              isNull(inviteCodes.expiresAt),
              gt(inviteCodes.expiresAt, new Date())
            )
          )
        )
        .limit(1);

      if (!inviteCode || inviteCode.useCount >= inviteCode.maxUses) {
        return NextResponse.json(
          { error: 'Invalid or expired invite code' },
          { status: 400 }
        );
      }

      // Increment use count
      await db
        .update(inviteCodes)
        .set({ useCount: sql`${inviteCodes.useCount} + 1` })
        .where(eq(inviteCodes.id, inviteCode.id));

      validatedInviteCode = normalizedCode;
    }

    // Generate a real wallet for the agent
    const { address: agentWalletAddress, encryptedKey } = generateAgentWallet();

    // Use prompt field or fall back to personality/strategy
    const personality = data.prompt || data.personality || 'I am an AI trading agent focused on identifying profitable opportunities while managing risk carefully.';
    const strategy = data.strategy || 'adaptive';

    // Map model to llmConfig
    const llmConfig = {
      primaryModel: data.model,
      simpleModel: 'gpt-4o-mini',
      analysisModel: data.model,
      autoSelect: false,
      parameters: {
        temperature: 0.3,
        topP: 0.9,
        frequencyPenalty: 0,
        presencePenalty: 0,
        maxTokens: 4096,
      },
    };

    const approvedPairs = data.approvedPairs || data.policies?.approvedPairs || ['BTC', 'ETH', 'SOL'];

    const [newAgent] = await db
      .insert(agents)
      .values({
        userId: user.id,
        name: data.name,
        isDemo: data.isDemo,
        demoBalance: data.isDemo ? '5000' : null,
        inviteCodeUsed: validatedInviteCode,
        personality,
        strategy,
        walletAddress: agentWalletAddress,
        apiKeyEncrypted: encryptedKey,
        llmConfig,
        policies: {
          maxLeverage: data.policies?.maxLeverage || 10,
          maxPositionSizeUsd: data.policies?.maxPositionSizeUsd || 1000,
          maxPositionSizePct: data.policies?.maxPositionSizePct || 10,
          maxDrawdownPct: data.policies?.maxDrawdownPct || 20,
          approvedPairs,
        },
        executionInterval: data.executionIntervalSeconds || 300,
        status: 'paused',
      })
      .returning();

    return NextResponse.json({ agent: newAgent }, { status: 201 });
  } catch (error) {
    console.error('Failed to create agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create agent', details: errorMessage },
      { status: 500 }
    );
  }
}
