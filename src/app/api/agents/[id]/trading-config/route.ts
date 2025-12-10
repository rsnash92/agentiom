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

// Position sizing strategies
const POSITION_SIZING_STRATEGIES = [
  {
    id: 'fixed_fractional',
    name: 'Fixed Percentage',
    description: 'Risk a fixed % of account per trade',
    icon: '📊',
  },
  {
    id: 'kelly_criterion',
    name: 'Kelly Criterion',
    description: 'Optimize for long-term growth based on win rate',
    icon: '📈',
  },
  {
    id: 'volatility_adjusted',
    name: 'Volatility-Adjusted',
    description: 'Smaller positions in volatile markets',
    icon: '🌊',
  },
  {
    id: 'risk_per_trade',
    name: 'Fixed Risk',
    description: 'Risk $X per trade regardless of setup',
    icon: '🎯',
  },
] as const;

// Trailing stop types
const TRAILING_STOP_TYPES = [
  {
    id: 'percentage',
    name: 'Percentage',
    description: 'Trail by a fixed percentage',
  },
  {
    id: 'atr',
    name: 'ATR-Based',
    description: 'Trail by multiple of ATR (volatility-adaptive)',
  },
  {
    id: 'step',
    name: 'Step',
    description: 'Move stop in increments at gain thresholds',
  },
  {
    id: 'breakeven',
    name: 'Breakeven',
    description: 'Move to breakeven after profit threshold',
  },
] as const;

const tradingConfigSchema = z.object({
  positionSizing: z.object({
    strategy: z.enum(['fixed_fractional', 'kelly_criterion', 'volatility_adjusted', 'risk_per_trade']),
    maxRiskPerTrade: z.number().min(10).max(10000).optional(),
    kellyFraction: z.number().min(0.1).max(1).optional(),
    volatilityMultiplier: z.number().min(0.5).max(3).optional(),
  }).optional(),
  trailingStop: z.object({
    enabled: z.boolean(),
    type: z.enum(['percentage', 'atr', 'step', 'breakeven']),
    trailPercent: z.number().min(0.5).max(10).optional(),
    atrMultiplier: z.number().min(1).max(5).optional(),
    stepPercent: z.number().min(0.5).max(5).optional(),
    stepGain: z.number().min(1).max(10).optional(),
    breakevenTriggerPercent: z.number().min(1).max(10).optional(),
  }).optional(),
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

// GET /api/agents/[id]/trading-config - Get agent trading config
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent
    const [agent] = await db
      .select({ policies: agents.policies })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const policies = agent.policies as {
      positionSizing?: { strategy: string };
      trailingStop?: { enabled: boolean; type: string };
    };

    return NextResponse.json({
      positionSizing: policies.positionSizing || { strategy: 'fixed_fractional' },
      trailingStop: policies.trailingStop || { enabled: true, type: 'percentage', trailPercent: 2 },
      availableStrategies: POSITION_SIZING_STRATEGIES,
      availableTrailingStopTypes: TRAILING_STOP_TYPES,
    });
  } catch (error) {
    console.error('Get trading config error:', error);
    return NextResponse.json(
      { error: 'Failed to get trading config' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id]/trading-config - Update agent trading config
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = tradingConfigSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid config', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Get current agent policies
    const [currentAgent] = await db
      .select({ policies: agents.policies })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!currentAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Merge new config with existing policies
    type AgentPolicies = typeof currentAgent.policies;
    const currentPolicies = currentAgent.policies;
    const updatedPolicies: AgentPolicies = {
      ...currentPolicies,
      ...(parseResult.data.positionSizing && { positionSizing: parseResult.data.positionSizing }),
      ...(parseResult.data.trailingStop && { trailingStop: parseResult.data.trailingStop }),
    };

    // Update agent
    const [updated] = await db
      .update(agents)
      .set({
        policies: updatedPolicies,
        updatedAt: new Date(),
      })
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .returning({ id: agents.id, policies: agents.policies });

    if (!updated) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const newPolicies = updated.policies as {
      positionSizing?: { strategy: string };
      trailingStop?: { enabled: boolean; type: string };
    };

    return NextResponse.json({
      positionSizing: newPolicies.positionSizing,
      trailingStop: newPolicies.trailingStop,
    });
  } catch (error) {
    console.error('Update trading config error:', error);
    return NextResponse.json(
      { error: 'Failed to update trading config' },
      { status: 500 }
    );
  }
}
