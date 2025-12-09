import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateAgentWallet } from '@/lib/crypto';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

// Validation schema for creating an agent
const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  personality: z.string().min(1),
  strategy: z.string().min(1),
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
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
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

    // Generate a real wallet for the agent
    const { address: agentWalletAddress, encryptedKey } = generateAgentWallet();

    const [newAgent] = await db
      .insert(agents)
      .values({
        userId: user.id,
        name: data.name,
        personality: data.personality,
        strategy: data.strategy,
        walletAddress: agentWalletAddress,
        apiKeyEncrypted: encryptedKey,
        policies: data.policies || {
          maxLeverage: 10,
          maxPositionSizeUsd: 1000,
          maxPositionSizePct: 10,
          maxDrawdownPct: 20,
          approvedPairs: ['BTC', 'ETH'],
        },
        executionInterval: data.executionIntervalSeconds || 300,
        status: 'paused',
      })
      .returning();

    return NextResponse.json({ agent: newAgent }, { status: 201 });
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
